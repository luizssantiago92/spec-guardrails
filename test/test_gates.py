"""Unit tests for the deterministic gate scripts.

Run from the repository root:

    python3 -m unittest discover -s test -p 'test_*.py'
"""

from __future__ import annotations

import io
import os
import sys
import tempfile
import unittest
from contextlib import contextmanager, redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import _common  # noqa: E402
import check_commit  # noqa: E402
import check_suppressions  # noqa: E402
import run_quality_checks  # noqa: E402
import _project_config  # noqa: E402
import validate_spec  # noqa: E402
import validate_state  # noqa: E402
import validate_tasks  # noqa: E402

VALID_SPEC = """# Spec: Authentication

## Goal
Let users sign in with email and password.

## Requirements

### REQ-001: Email login
- **Acceptance Criteria**: WHEN a user submits valid credentials THEN the system SHALL create a session
- WHEN a user submits invalid credentials THEN the system SHALL return 401 with code AUTH_INVALID

## Assumptions
- Email is the only identity provider for this feature

## Out of Scope
- Social login providers
"""

VALID_TASKS = """# Tasks: Authentication

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: test/auth/token.test.ts
- **Gate**: npm test
- **Done when**: module signs and verifies tokens

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: T1
- **Tests**: test/routes/login.test.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200 for valid credentials
"""

VALID_VALIDATION = """# Validation: Authentication

- Verifier: independent agent
- Verdict: PASS

## Coverage
- REQ-001 - test/routes/login.test.ts:24

## Discrimination Sensor
- Removed expiry check - test/auth/token.test.ts:41 killed the mutant
"""


class SpecGateTest(unittest.TestCase):
    def test_valid_spec_passes(self):
        report = validate_spec.build_report("spec.md", VALID_SPEC)
        self.assertTrue(report.passed, report.errors)

    def test_requirement_body_stops_at_next_section(self):
        report = validate_spec.build_report("spec.md", VALID_SPEC)
        self.assertEqual(
            [warning for warning in report.warnings if "Social login" in warning], []
        )

    def test_missing_out_of_scope_fails(self):
        spec = VALID_SPEC.replace("## Out of Scope\n- Social login providers\n", "")
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(any("Out of Scope" in error for error in report.errors))

    def test_requirement_without_criteria_fails(self):
        spec = VALID_SPEC.replace(
            "- **Acceptance Criteria**: WHEN a user submits valid credentials "
            "THEN the system SHALL create a session\n"
            "- WHEN a user submits invalid credentials THEN the system SHALL "
            "return 401 with code AUTH_INVALID\n",
            "",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(
            any("no acceptance criteria" in error for error in report.errors)
        )

    def test_metadata_bullets_are_not_acceptance_criteria(self):
        spec = VALID_SPEC.replace(
            "### REQ-001: Email login\n",
            "### REQ-001: Email login\n- **Owner**: platform team\n- **Priority**: P1\n",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(
            [w for w in report.warnings if "Owner" in w or "Priority" in w], []
        )

    def test_generic_types_are_not_placeholders(self):
        spec = VALID_SPEC.replace(
            "THEN the system SHALL create a session",
            "THEN the system SHALL return Promise<void> for a List<User> payload",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)

    def test_template_tokens_in_angle_brackets_still_fail(self):
        spec = VALID_SPEC.replace("- Social login providers", "- <fill me>")
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(any("placeholder" in error for error in report.errors))

    def test_placeholder_fails(self):
        spec = VALID_SPEC.replace("Social login providers", "TBD")
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(any("placeholder" in error for error in report.errors))

    def test_duplicate_requirement_id_fails(self):
        spec = VALID_SPEC.replace(
            "## Assumptions",
            "### REQ-001: Duplicate\n"
            "- WHEN x THEN system SHALL y\n\n"
            "## Assumptions",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(any("duplicate" in error for error in report.errors))

    def test_duplicate_outside_requirements_is_ignored(self):
        spec = VALID_SPEC + "\n### REQ-001: Duplicate after OOS\n- WHEN x THEN system SHALL y\n"
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)

    def test_missing_assumptions_fails(self):
        spec = VALID_SPEC.replace(
            "## Assumptions\n- Email is the only identity provider for this feature\n\n",
            "",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(any("Assumptions" in error for error in report.errors))

    def test_criterion_without_shall_or_must_fails(self):
        spec = VALID_SPEC.replace(
            "THEN the system SHALL create a session",
            "THEN the system should create a session",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(
            any("SHALL or MUST" in error for error in report.errors)
        )

    def test_will_is_not_a_normative_verb(self):
        spec = VALID_SPEC.replace(
            "THEN the system SHALL return 401 with code AUTH_INVALID",
            "THEN the system will return 401 with code AUTH_INVALID",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(
            any("SHALL or MUST" in error for error in report.errors)
        )

    def test_multiline_acceptance_criteria_pass(self):
        spec = VALID_SPEC.replace(
            "- **Acceptance Criteria**: WHEN a user submits valid credentials THEN the system SHALL create a session\n"
            "- WHEN a user submits invalid credentials THEN the system SHALL return 401 with code AUTH_INVALID\n",
            "- **Acceptance Criteria**:\n"
            "  WHEN a user submits valid credentials THEN the system SHALL create a session\n"
            "  WHEN a user submits invalid credentials THEN the system SHALL return 401 with code AUTH_INVALID\n",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)
        spec = VALID_SPEC.replace("SHALL", "MUST")
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(
            [w for w in report.warnings if "no trigger" in w], []
        )

    def test_shall_without_ears_trigger_is_a_warning(self):
        spec = VALID_SPEC.replace(
            "WHEN a user submits valid credentials THEN the system SHALL create a session",
            "the system SHALL create a session",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)
        self.assertTrue(
            any("no trigger" in warning for warning in report.warnings)
        )

    def test_fenced_code_is_not_acceptance_criteria(self):
        spec = VALID_SPEC.replace(
            "- WHEN a user submits invalid credentials THEN the system SHALL "
            "return 401 with code AUTH_INVALID\n",
            "- WHEN a user submits invalid credentials THEN the system SHALL "
            "return 401 with code AUTH_INVALID\n"
            "\n```ts\n// TODO: example snippet, not a hole\nconst x = 1\n```\n",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)

    def test_html_comment_todo_is_not_a_placeholder(self):
        spec = VALID_SPEC.replace(
            "- Social login providers",
            "- Social login providers <!-- TODO: maybe later -->",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)

    def test_markdown_table_rows_are_not_acceptance_criteria(self):
        spec = VALID_SPEC.replace(
            "### REQ-001: Email login\n",
            "### REQ-001: Email login\n\n| Field | Value |\n| --- | --- |\n| Owner | platform |\n",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)

    def test_hyphen_acceptance_criteria_separator_is_accepted(self):
        spec = VALID_SPEC.replace(
            "- **Acceptance Criteria**: WHEN a user submits valid credentials "
            "THEN the system SHALL create a session",
            "- **Acceptance Criteria** - WHEN a user submits valid credentials "
            "THEN the system SHALL create a session",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)


class TasksGateTest(unittest.TestCase):
    def test_valid_tasks_pass(self):
        report = validate_tasks.build_report("tasks.md", VALID_TASKS)
        self.assertTrue(report.passed, report.errors)

    def test_missing_required_field_fails(self):
        tasks = VALID_TASKS.replace("- **Gate**: npm test\n", "", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Gate" in error for error in report.errors))

    def test_forward_dependency_fails(self):
        tasks = VALID_TASKS.replace("- **Depends on**: —", "- **Depends on**: T2", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(
            any("forward dependency" in error for error in report.errors)
        )

    def test_unknown_dependency_fails(self):
        tasks = VALID_TASKS.replace("- **Depends on**: T1", "- **Depends on**: T9", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("unknown task" in error for error in report.errors))

    def test_requirement_without_spec_id_fails(self):
        tasks = VALID_TASKS.replace("- **Requirement**: REQ-001", "- **Requirement**: auth", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(
            any("does not reference a spec ID" in error for error in report.errors)
        )

    def test_no_tasks_fails(self):
        report = validate_tasks.build_report("tasks.md", "# Tasks\n\nnothing here\n")
        self.assertFalse(report.passed)

    def test_checked_task_boxes_are_not_placeholders(self):
        report = validate_tasks.build_report(
            "tasks.md", VALID_TASKS + "- [x] complete\n- [ ] pending\n"
        )
        self.assertEqual(
            [error for error in report.errors if "placeholder" in error], []
        )

    def test_cycle_is_detected(self):
        tasks = "# Tasks\n\n" + "".join(
            f"### T{i}: Do the thing {i}\n"
            f"- **Requirement**: REQ-001\n"
            f"- **Files**: src/mod{i}.ts\n"
            f"- **Depends on**: T{3 if i == 1 else i - 1}\n"
            f"- **Tests**: t.ts\n"
            f"- **Gate**: npm test\n"
            f"- **Done when**: thing {i} works\n\n"
            for i in (1, 2, 3)
        )
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("cycle" in error for error in report.errors))

    def test_task_ids_beyond_t999_are_parsed(self):
        tasks = (
            "# Tasks\n\n### T1000: Add the last module\n"
            "- **Requirement**: REQ-001\n"
            "- **Files**: src/last.ts\n"
            "- **Depends on**: —\n"
            "- **Tests**: t.ts\n- **Gate**: npm test\n"
            "- **Done when**: last module is exported\n"
        )
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertTrue(report.passed, report.errors)
        self.assertTrue(any("1 task(s)" in check for check in report.checks))

    def test_long_dependency_chain_does_not_exhaust_the_stack(self):
        tasks = "# Tasks\n\n" + "".join(
            f"### T{i}: Add module number {i}\n"
            f"- **Requirement**: REQ-001\n"
            f"- **Files**: src/mod{i}.ts\n"
            f"- **Depends on**: {'—' if i == 1 else f'T{i - 1}'}\n"
            f"- **Tests**: t.ts\n"
            f"- **Gate**: npm test\n"
            f"- **Done when**: module {i} works\n\n"
            for i in range(1, 3001)
        )
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertTrue(report.passed, report.errors[:3])

    def test_same_phase_dependency_passes(self):
        tasks = """# Tasks

### Phase 1

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign and verify

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: T1
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertTrue(report.passed, report.errors)
        self.assertTrue(any("phase" in check for check in report.checks))

    def test_later_phase_dependency_fails(self):
        # T1 is later in the file (not a forward-ID error) but sits in an
        # earlier phase than T2, which it depends on.
        tasks = """# Tasks

### Phase 2

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200

### Phase 1

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: T2
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign and verify
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(
            any("later one" in error or "from phase" in error for error in report.errors)
        )
        self.assertFalse(
            any("forward dependency" in error for error in report.errors)
        )

    def test_h1_phase_headings_are_recognized(self):
        tasks = """# Tasks

# Phase 2

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200

# Phase 1

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: T2
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign and verify
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("from phase" in error for error in report.errors))

    def test_requirement_id_is_not_parsed_as_a_task_dependency(self):
        tasks = VALID_TASKS.replace("- **Depends on**: T1", "- **Depends on**: REQ-T100", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertTrue(report.passed, report.errors)
        self.assertFalse(any("T100" in error for error in report.errors))

    def test_fenced_task_heading_is_ignored(self):
        report = validate_tasks.build_report(
            "tasks.md", VALID_TASKS + "\n```md\n### T99: Fake fenced task\n```\n"
        )
        self.assertTrue(report.passed, report.errors)
        self.assertFalse(any("T99" in error for error in report.errors))

    def test_todo_in_a_task_title_is_not_a_placeholder(self):
        tasks = VALID_TASKS.replace(
            "Create session token module", "Fix TODO later in tokens"
        )
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertTrue(report.passed, report.errors)

    def test_missing_done_when_fails(self):
        tasks = VALID_TASKS.replace("- **Done when**: module signs and verifies tokens\n", "", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Done When" in error for error in report.errors))

    def test_placeholder_done_when_fails(self):
        tasks = VALID_TASKS.replace(
            "module signs and verifies tokens", "—", 1
        )
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Done When" in error for error in report.errors))

    def test_missing_files_fails(self):
        tasks = VALID_TASKS.replace("- **Files**: src/auth/token.ts\n", "", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Files" in error for error in report.errors))

    def test_tests_none_fails(self):
        tasks = VALID_TASKS.replace("test/auth/token.test.ts", "none", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Tests" in error for error in report.errors))

    def test_files_none_fails(self):
        tasks = VALID_TASKS.replace("src/auth/token.ts", "none", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Files" in error for error in report.errors))

    def test_gate_none_fails(self):
        tasks = VALID_TASKS.replace("- **Gate**: npm test\n", "- **Gate**: none\n", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Gate" in error for error in report.errors))

    def test_dot_slash_file_paths_count_as_overlap(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: ./src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_leading_slash_file_paths_count_as_overlap(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: /src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_case_folded_file_paths_count_as_overlap(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/Auth/Token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_markdown_link_file_paths_count_as_overlap(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: [token](src/auth/token.ts)
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_out_of_scope_requirement_headings_are_ignored(self):
        spec = VALID_SPEC + "\n### NOTE-001: Future social login\n- deferred\n"
        report = validate_tasks.build_report(
            "tasks.md", VALID_TASKS, spec_text=spec
        )
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(
            _common.requirement_ids(spec),
            ["REQ-001"],
        )

    def test_assumption_requirement_headings_are_ignored(self):
        spec = VALID_SPEC.replace(
            "## Assumptions\n- Email is the only identity provider for this feature\n",
            "## Assumptions\n### NOTE-002: Assumed SLA\n- assumed\n",
        )
        report = validate_tasks.build_report(
            "tasks.md", VALID_TASKS, spec_text=spec
        )
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(_common.requirement_ids(spec), ["REQ-001"])
        spec_report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(spec_report.passed, spec_report.errors)
        self.assertEqual(
            [req_id for req_id, _, _ in validate_spec.split_requirements(spec)],
            ["REQ-001"],
        )

    def test_quoted_file_paths_count_as_overlap(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: `src/auth/token.ts`
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: "src/auth/token.ts"
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_parent_relative_file_paths_count_as_overlap(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: ../src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_uncovered_spec_requirement_fails(self):
        spec = VALID_SPEC.replace(
            "## Assumptions\n",
            "### REQ-002: Token refresh\n"
            "- WHEN refresh THEN the system SHALL rotate\n\n"
            "## Assumptions\n",
        )
        report = validate_tasks.build_report(
            "tasks.md", VALID_TASKS, spec_text=spec
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("REQ-002" in error for error in report.errors))

    def test_spec_requirements_covered_by_tasks_pass(self):
        report = validate_tasks.build_report(
            "tasks.md", VALID_TASKS, spec_text=VALID_SPEC
        )
        self.assertTrue(report.passed, report.errors)
        self.assertTrue(any("covered by tasks" in check for check in report.checks))

    def test_independent_tasks_sharing_a_file_fail(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/shared.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/auth/shared.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in error for error in report.errors))

    def test_dependent_tasks_may_share_a_file(self):
        tasks = """# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Extend token module helpers
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: T1
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: helpers export
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertTrue(report.passed, report.errors)


class StateGateTest(unittest.TestCase):
    def _feature_dir(self, validation: str | None = VALID_VALIDATION, tasks: str | None = None):
        temp_dir = Path(tempfile.mkdtemp())
        (temp_dir / "spec.md").write_text(VALID_SPEC, encoding="utf-8")
        if validation is not None:
            (temp_dir / "validation.md").write_text(validation, encoding="utf-8")
        if tasks is not None:
            (temp_dir / "tasks.md").write_text(tasks, encoding="utf-8")
        return temp_dir

    def test_complete_feature_passes(self):
        report = validate_state.build_report(self._feature_dir())
        self.assertTrue(report.passed, report.errors)

    def test_missing_validation_fails(self):
        report = validate_state.build_report(self._feature_dir(validation=None))
        self.assertFalse(report.passed)
        self.assertTrue(any("validation.md missing" in e for e in report.errors))

    def test_fail_verdict_blocks(self):
        report = validate_state.build_report(
            self._feature_dir(VALID_VALIDATION.replace("PASS", "FAIL"))
        )
        self.assertFalse(report.passed)

    def test_missing_evidence_fails(self):
        without_evidence = VALID_VALIDATION.replace(
            "- REQ-001 - test/routes/login.test.ts:24", "- REQ-001 - covered"
        ).replace(
            "- Removed expiry check - test/auth/token.test.ts:41 killed the mutant",
            "- Removed expiry check killed the mutant",
        )
        report = validate_state.build_report(self._feature_dir(without_evidence))
        self.assertFalse(report.passed)
        self.assertTrue(any("evidence" in e for e in report.errors))

    def test_url_with_port_is_not_evidence(self):
        report = validate_state.build_report(
            self._feature_dir(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - see https://ci.example.com:8080 for the run\n"
                "## Discrimination Sensor\n- mutant killed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("evidence" in e for e in report.errors))

    def test_real_evidence_still_counts_next_to_a_url(self):
        report = validate_state.build_report(
            self._feature_dir(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - test/routes/login.test.ts:24 (https://ci.example.com:8080)\n"
                "## Discrimination Sensor\n- mutant killed\n"
            )
        )
        self.assertTrue(report.passed, report.errors)

    def test_verdict_written_as_a_heading_is_accepted(self):
        report = validate_state.build_report(
            self._feature_dir(
                "# V\n\n## Verdict\nPASS\n\n## Coverage\n"
                "- REQ-001 - test/routes/login.test.ts:24\n"
                "## Discrimination Sensor\n- mutant killed\n"
            )
        )
        self.assertTrue(report.passed, report.errors)

    def test_verdict_buried_under_sensor_is_rejected(self):
        report = validate_state.build_report(
            self._feature_dir(
                "# Validation\n\n## Discrimination Sensor\n"
                "- Verdict: PASS\n"
                "- mutant killed\n"
                "## Coverage\n"
                "- REQ-001 - test/routes/login.test.ts:24\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("no verdict" in e for e in report.errors))

    def test_open_task_blocks_completion(self):
        report = validate_state.build_report(
            self._feature_dir(tasks="### T1: Do thing\n- [ ] complete\n")
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("open task" in e for e in report.errors))

    def test_passing_is_not_a_pass_verdict(self):
        report = validate_state.build_report(
            self._feature_dir(VALID_VALIDATION.replace("PASS", "PASSING"))
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("not PASS" in e or "not filled" in e for e in report.errors))

    def test_pass_with_gaps_is_not_a_pass_verdict(self):
        report = validate_state.build_report(
            self._feature_dir(VALID_VALIDATION.replace("PASS", "PASS WITH GAPS"))
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("WITH GAPS" in e or "not PASS" in e for e in report.errors))

    def test_config_file_line_is_not_test_evidence(self):
        report = validate_state.build_report(
            self._feature_dir(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - config.yaml:12\n"
                "## Discrimination Sensor\n- mutant killed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("evidence" in e for e in report.errors))

    def test_requirement_without_same_line_evidence_fails(self):
        report = validate_state.build_report(
            self._feature_dir(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 covered somehow\n"
                "- extra - test/routes/login.test.ts:24\n"
                "## Discrimination Sensor\n- mutant killed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("REQ-001" in e for e in report.errors))

    def test_medium_plus_requires_discrimination_sensor(self):
        tasks = "# Tasks\n\n" + "".join(
            f"### T{i}: Add module number {i}\n"
            f"- **Requirement**: REQ-001\n"
            f"- **Files**: src/mod{i}.ts\n"
            f"- **Depends on**: —\n"
            f"- **Tests**: t.ts\n"
            f"- **Gate**: npm test\n"
            f"- **Done when**: module {i} works\n"
            f"- [x] complete\n\n"
            for i in range(1, 5)
        )
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
        )
        report = validate_state.build_report(
            self._feature_dir(validation=validation, tasks=tasks)
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Medium+" in e for e in report.errors))

    def test_sensor_heading_alone_is_not_an_outcome(self):
        tasks = "# Tasks\n\n" + "".join(
            f"### T{i}: Add module number {i}\n"
            f"- **Requirement**: REQ-001\n"
            f"- **Files**: src/mod{i}.ts\n"
            f"- **Depends on**: —\n"
            f"- **Tests**: t.ts\n"
            f"- **Gate**: npm test\n"
            f"- **Done when**: module {i} works\n"
            f"- [x] complete\n\n"
            for i in range(1, 5)
        )
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
            "## Discrimination Sensor\n"
            "- noted for later\n"
        )
        report = validate_state.build_report(
            self._feature_dir(validation=validation, tasks=tasks)
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Medium+" in e for e in report.errors))

    def test_pass_with_survived_mutant_fails(self):
        report = validate_state.build_report(
            self._feature_dir(
                VALID_VALIDATION.replace(
                    "killed the mutant", "mutant survived"
                )
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("survived" in e for e in report.errors))

    def test_medium_plus_pass_requires_killed_not_only_injected(self):
        tasks = "# Tasks\n\n" + "".join(
            f"### T{i}: Add module number {i}\n"
            f"- **Requirement**: REQ-001\n"
            f"- **Files**: src/mod{i}.ts\n"
            f"- **Depends on**: —\n"
            f"- **Tests**: t.ts\n"
            f"- **Gate**: npm test\n"
            f"- **Done when**: module {i} works\n"
            f"- [x] complete\n\n"
            for i in range(1, 5)
        )
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
            "## Discrimination Sensor\n"
            "- mutant injected for expiry check\n"
        )
        report = validate_state.build_report(
            self._feature_dir(validation=validation, tasks=tasks)
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("killed" in e for e in report.errors))

    def test_killed_only_under_gaps_does_not_count(self):
        tasks = "# Tasks\n\n" + "".join(
            f"### T{i}: Add module number {i}\n"
            f"- **Requirement**: REQ-001\n"
            f"- **Files**: src/mod{i}.ts\n"
            f"- **Depends on**: —\n"
            f"- **Tests**: t.ts\n"
            f"- **Gate**: npm test\n"
            f"- **Done when**: module {i} works\n"
            f"- [x] complete\n\n"
            for i in range(1, 5)
        )
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
            "## Discrimination Sensor\n"
            "- mutant injected for expiry check\n"
            "## Gaps\n"
            "- we later killed it somehow\n"
        )
        report = validate_state.build_report(
            self._feature_dir(validation=validation, tasks=tasks)
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("killed" in e for e in report.errors))

    def test_conflicting_preamble_and_heading_verdicts_fail(self):
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
            "## Verdict\nFAIL\n"
            "## Discrimination Sensor\n"
            "- mutant killed\n"
        )
        report = validate_state.build_report(self._feature_dir(validation=validation))
        self.assertFalse(report.passed)
        self.assertTrue(any("conflicting" in e for e in report.errors))

    def test_fenced_evidence_does_not_count(self):
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "```\n- REQ-001 - test/routes/login.test.ts:24\n```\n"
            "## Discrimination Sensor\n"
            "- mutant killed\n"
        )
        report = validate_state.build_report(self._feature_dir(validation=validation))
        self.assertFalse(report.passed)
        self.assertTrue(any("evidence" in e for e in report.errors))

    def test_html_comment_evidence_does_not_count(self):
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "<!-- REQ-001 - test/routes/login.test.ts:24 -->\n"
            "- covered somehow\n"
            "## Discrimination Sensor\n"
            "- mutant killed\n"
        )
        report = validate_state.build_report(self._feature_dir(validation=validation))
        self.assertFalse(report.passed)
        self.assertTrue(
            any("evidence" in e or "REQ-001" in e for e in report.errors)
        )

    def test_pass_with_open_gaps_fails(self):
        report = validate_state.build_report(
            self._feature_dir(VALID_VALIDATION + "\n## Gaps\n- login still flaky\n")
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Gaps" in e for e in report.errors))

    def test_pass_with_security_fail_fails(self):
        report = validate_state.build_report(
            self._feature_dir(
                VALID_VALIDATION
                + "\n## Security Review\n- Result: fail\n- XSS unfixed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Security Review" in e for e in report.errors))

    def test_empty_design_md_does_not_force_medium_plus(self):
        temp_dir = self._feature_dir(
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
        )
        (temp_dir / "design.md").write_text("   \n", encoding="utf-8")
        report = validate_state.build_report(temp_dir)
        self.assertTrue(report.passed, report.errors)
        self.assertTrue(any("discrimination sensor" in w for w in report.warnings))

    def test_small_feature_sensor_absence_is_a_warning(self):
        validation = (
            "# V\n- Verdict: PASS\n## Coverage\n"
            "- REQ-001 - test/routes/login.test.ts:24\n"
        )
        report = validate_state.build_report(self._feature_dir(validation=validation))
        self.assertTrue(report.passed, report.errors)
        self.assertTrue(any("discrimination sensor" in w for w in report.warnings))


@contextmanager
def _chdir(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


def _run_main(fn):
    buf = io.StringIO()
    with redirect_stdout(buf):
        return fn(), buf.getvalue()


def _capture_exit(fn):
    buf = io.StringIO()
    with redirect_stdout(buf):
        try:
            fn()
        except SystemExit as exc:
            return exc.code, buf.getvalue()
    raise AssertionError("expected SystemExit")


class FeatureResolveTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.features = self.root / ".specs" / "features"

    def tearDown(self):
        self.tmp.cleanup()

    def _write_feature(self, name: str, spec: str = VALID_SPEC, tasks: str | None = None):
        directory = self.features / name
        directory.mkdir(parents=True)
        (directory / "spec.md").write_text(spec, encoding="utf-8")
        if tasks is not None:
            (directory / "tasks.md").write_text(tasks, encoding="utf-8")
        return directory

    def test_auto_detects_the_only_feature(self):
        feature = self._write_feature("001-auth")
        resolved = _common.resolve_feature_dir(None, "validate-spec", root=self.root)
        self.assertEqual(resolved.resolve(), feature.resolve())

    def test_resolves_a_bare_feature_name(self):
        feature = self._write_feature("003-oauth-20")
        resolved = _common.resolve_feature_dir("003-oauth-20", "validate-spec", root=self.root)
        self.assertEqual(resolved.resolve(), feature.resolve())

    def test_resolves_a_path_to_the_artifact(self):
        feature = self._write_feature("001-auth")
        path, text = _common.resolve_artifact(
            str(feature / "spec.md"), "spec.md", "validate-spec", root=self.root
        )
        self.assertEqual(path.resolve(), (feature / "spec.md").resolve())
        self.assertIn("REQ-001", text)

    def test_empty_features_dir_is_a_usage_error(self):
        self.features.mkdir(parents=True)
        code, output = _capture_exit(
            lambda: _common.resolve_feature_dir(None, "validate-spec", root=self.root)
        )
        self.assertEqual(code, _common.EXIT_USAGE)
        self.assertIn("no features found", output)

    def test_missing_features_dir_is_a_usage_error(self):
        code, output = _capture_exit(
            lambda: _common.resolve_feature_dir(None, "validate-spec", root=self.root)
        )
        self.assertEqual(code, _common.EXIT_USAGE)
        self.assertIn("no features found", output)

    def test_multiple_features_require_an_explicit_name(self):
        self._write_feature("001-auth")
        self._write_feature("002-billing")
        code, output = _capture_exit(
            lambda: _common.resolve_feature_dir(None, "validate-spec", root=self.root)
        )
        self.assertEqual(code, _common.EXIT_USAGE)
        self.assertIn("2 features found", output)
        self.assertIn("001-auth", output)
        self.assertIn("002-billing", output)

    def test_unknown_feature_name_is_a_usage_error(self):
        self._write_feature("001-auth")
        code, output = _capture_exit(
            lambda: _common.resolve_feature_dir("nope", "validate-spec", root=self.root)
        )
        self.assertEqual(code, _common.EXIT_USAGE)
        self.assertIn("invalid feature id", output)

    def test_rejects_path_traversal_feature_ids(self):
        self.features.mkdir(parents=True)
        for raw in ("..", ".", "foo/../.."):
            with self.subTest(raw=raw):
                code, output = _capture_exit(
                    lambda raw=raw: _common.resolve_feature_dir(
                        raw, "validate-spec", root=self.root
                    )
                )
                self.assertEqual(code, _common.EXIT_USAGE)
                self.assertIn("invalid feature id", output)

    def test_wrong_artifact_filename_is_a_usage_error(self):
        feature = self._write_feature("001-auth", tasks=VALID_TASKS)
        code, output = _capture_exit(
            lambda: _common.resolve_artifact(
                str(feature / "tasks.md"), "spec.md", "validate-spec", root=self.root
            )
        )
        self.assertEqual(code, _common.EXIT_USAGE)
        self.assertIn("expected spec.md", output)

    def test_validate_spec_main_auto_detects_from_cwd(self):
        self._write_feature("001-auth")
        with _chdir(self.root):
            code, _ = _run_main(lambda: validate_spec.main([]))
        self.assertEqual(code, 0)

    def test_validate_spec_main_accepts_a_feature_name(self):
        self._write_feature("001-auth")
        self._write_feature("002-billing")
        with _chdir(self.root):
            code, _ = _run_main(lambda: validate_spec.main(["002-billing"]))
        self.assertEqual(code, 0)

    def test_validate_spec_main_lists_candidates_when_ambiguous(self):
        self._write_feature("001-auth")
        self._write_feature("002-billing")
        with _chdir(self.root):
            code, output = _capture_exit(lambda: validate_spec.main([]))
        self.assertEqual(code, _common.EXIT_USAGE)
        self.assertIn("001-auth", output)
        self.assertIn("002-billing", output)

    def test_three_tasks_without_task_graph_fails_on_disk(self):
        feature = self._write_feature("001-auth", tasks="""# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: test/auth/token.test.ts
- **Gate**: npm test
- **Done when**: module signs and verifies tokens

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: T1
- **Tests**: test/routes/login.test.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200 for valid credentials

### T3: Add logout endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/logout.ts
- **Depends on**: T1
- **Tests**: test/routes/logout.test.ts
- **Gate**: npm test
- **Done when**: endpoint clears the session
""")
        with _chdir(self.root):
            code, output = _run_main(lambda: validate_tasks.main([str(feature)]))
        self.assertEqual(code, 1)
        self.assertIn("task-graph.md", output)

    def test_three_tasks_with_task_graph_passes_on_disk(self):
        feature = self._write_feature("001-auth", tasks="""# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: test/auth/token.test.ts
- **Gate**: npm test
- **Done when**: module signs and verifies tokens

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: T1
- **Tests**: test/routes/login.test.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200 for valid credentials

### T3: Add logout endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/logout.ts
- **Depends on**: T1
- **Tests**: test/routes/logout.test.ts
- **Gate**: npm test
- **Done when**: endpoint clears the session
""")
        (feature / "task-graph.md").write_text("# Task Graph\n", encoding="utf-8")
        with _chdir(self.root):
            code, _ = _run_main(lambda: validate_tasks.main([str(feature)]))
        self.assertEqual(code, 0)

    def test_validate_tasks_main_accepts_a_feature_name(self):
        self._write_feature("001-auth", tasks=VALID_TASKS)
        with _chdir(self.root):
            code, _ = _run_main(lambda: validate_tasks.main(["001-auth"]))
        self.assertEqual(code, 0)

    def test_validate_state_main_accepts_a_feature_name(self):
        directory = self._write_feature("001-auth")
        (directory / "validation.md").write_text(VALID_VALIDATION, encoding="utf-8")
        with _chdir(self.root):
            code, _ = _run_main(lambda: validate_state.main(["001-auth"]))
        self.assertEqual(code, 0)


class CommitGateTest(unittest.TestCase):
    def test_conventional_message_passes(self):
        report = check_commit.build_report("feat(auth): add token refresh")
        self.assertTrue(report.passed, report.errors)

    def test_missing_type_fails(self):
        report = check_commit.build_report("added token refresh")
        self.assertFalse(report.passed)

    def test_unknown_type_fails(self):
        report = check_commit.build_report("feature(auth): add token refresh")
        self.assertFalse(report.passed)

    def test_trailing_period_fails(self):
        report = check_commit.build_report("fix(api): handle null response.")
        self.assertFalse(report.passed)

    def test_long_header_fails(self):
        subject = "x" * 80
        report = check_commit.build_report(f"feat(auth): {subject}")
        self.assertFalse(report.passed)

    def test_body_needs_blank_line(self):
        report = check_commit.build_report("feat(auth): add refresh\nbody line")
        self.assertFalse(report.passed)

    def test_merge_commit_is_skipped(self):
        report = check_commit.build_report("Merge pull request #12 from branch")
        self.assertTrue(report.passed)


class SuppressionGateTest(unittest.TestCase):
    def test_blocks_noqa_in_added_line(self):
        diff = "+++ b/src/app.py\n+    x = 1  # noqa\n"
        report = check_suppressions.build_report(diff, [r"#\s*noqa\b"])
        self.assertFalse(report.passed)

    def test_passes_clean_diff(self):
        diff = "+++ b/src/app.py\n+    x = 1\n"
        report = check_suppressions.build_report(diff, [r"#\s*noqa\b"])
        self.assertTrue(report.passed)


class ProjectConfigTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_loads_quality_checks(self):
        config_dir = self.root / ".specs"
        config_dir.mkdir(parents=True, exist_ok=True)
        (config_dir / "config.yaml").write_text(
            "quality:\n  checks:\n    - npm test\n    - npm run lint\n",
            encoding="utf-8",
        )
        with _chdir(self.root):
            config = _project_config.load_project_config()
        self.assertEqual(config["quality"]["checks"], ["npm test", "npm run lint"])


class QualityChecksTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_skips_when_no_checks_configured(self):
        with _chdir(self.root):
            code, _ = _run_main(lambda: run_quality_checks.main([]))
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
