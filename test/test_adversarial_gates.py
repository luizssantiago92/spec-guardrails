"""Adversarial matrix for closed gate false-pass families (0.5–0.6.8).

New free-form audit findings must land here as a failing case *before* a gate
fix. See prd/gate-stability.md.

Run via:

    npm run test:gates
"""

from __future__ import annotations

import sys
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import _common  # noqa: E402
import check_commit  # noqa: E402
import check_suppressions  # noqa: E402
import validate_spec  # noqa: E402
import validate_state  # noqa: E402
import validate_tasks  # noqa: E402

SPEC = """# Spec: Authentication

## Goal
Let users sign in with email and password.

## Requirements

### REQ-001: Email login
- **Acceptance Criteria**: WHEN a user submits valid credentials THEN the system SHALL create a session

## Assumptions
- none

## Out of Scope
- Social login
"""

TASKS = """# Tasks

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

VALIDATION = """# Validation

- Verifier: independent agent
- Verdict: PASS

## Coverage
- REQ-001 - test/routes/login.test.ts:24

## Discrimination Sensor
- Removed expiry check - test/auth/token.test.ts:41 killed the mutant
"""


def _feature(
    validation: str = VALIDATION,
    tasks: str | None = None,
    spec: str = SPEC,
    design: str | None = None,
) -> Path:
    temp = Path(tempfile.mkdtemp())
    (temp / "spec.md").write_text(spec, encoding="utf-8")
    (temp / "validation.md").write_text(validation, encoding="utf-8")
    if tasks is not None:
        (temp / "tasks.md").write_text(tasks, encoding="utf-8")
    if design is not None:
        (temp / "design.md").write_text(design, encoding="utf-8")
    return temp


def _medium_tasks() -> str:
    return "# Tasks\n\n" + "".join(
        f"### T{i}: Add module number {i}\n"
        f"- **Requirement**: REQ-001\n"
        f"- **Files**: src/mod{i}.ts\n"
        f"- **Depends on**: —\n"
        f"- **Tests**: t.ts\n"
        f"- **Gate**: npm test\n"
        f"- **Done when**: module {i} works well\n"
        f"- [x] complete\n\n"
        for i in range(1, 5)
    )


def _two_independent(files_a: str, files_b: str) -> str:
    return f"""# Tasks

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: {files_a}
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: {files_b}
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200
"""


class VerdictFamilyTest(unittest.TestCase):
    def test_pass_with_gaps_fails(self):
        report = validate_state.build_report(
            _feature(VALIDATION.replace("PASS", "PASS WITH GAPS"))
        )
        self.assertFalse(report.passed)

    def test_verdict_buried_under_sensor_fails(self):
        report = validate_state.build_report(
            _feature(
                "# Validation\n\n## Discrimination Sensor\n"
                "- Verdict: PASS\n- mutant killed\n"
                "## Coverage\n- REQ-001 - test/x.test.ts:1\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("no verdict" in e for e in report.errors))

    def test_conflicting_preamble_and_heading_fails(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - test/x.test.ts:1\n"
                "## Verdict\nFAIL\n"
                "## Discrimination Sensor\n- mutant killed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("conflicting" in e for e in report.errors))


class EvidenceFamilyTest(unittest.TestCase):
    def test_non_test_path_is_not_evidence(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - config.yaml:12\n"
                "## Discrimination Sensor\n- killed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("evidence" in e for e in report.errors))

    def test_fenced_evidence_does_not_count(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "```\n- REQ-001 - test/x.test.ts:1\n```\n"
                "## Discrimination Sensor\n- killed\n"
            )
        )
        self.assertFalse(report.passed)

    def test_html_comment_evidence_does_not_count(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "<!-- REQ-001 - test/x.test.ts:1 -->\n"
                "## Discrimination Sensor\n- killed\n"
            )
        )
        self.assertFalse(report.passed)

    def test_req_and_evidence_must_share_a_line(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001\n- test/x.test.ts:1\n"
                "## Discrimination Sensor\n- killed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("REQ-001" in e for e in report.errors))


class SensorFamilyTest(unittest.TestCase):
    def test_sensor_heading_alone_fails_medium_plus(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - test/x.test.ts:1\n"
                "## Discrimination Sensor\n- noted for later\n",
                tasks=_medium_tasks(),
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Medium+" in e for e in report.errors))

    def test_injected_only_fails_medium_plus_pass(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - test/x.test.ts:1\n"
                "## Discrimination Sensor\n- mutant injected\n",
                tasks=_medium_tasks(),
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("killed" in e for e in report.errors))

    def test_killed_only_under_gaps_fails_medium_plus_pass(self):
        report = validate_state.build_report(
            _feature(
                "# V\n- Verdict: PASS\n## Coverage\n"
                "- REQ-001 - test/x.test.ts:1\n"
                "## Discrimination Sensor\n- mutant injected\n"
                "## Gaps\n- we later killed it somehow\n",
                tasks=_medium_tasks(),
            )
        )
        self.assertFalse(report.passed)

    def test_survived_mutant_blocks_pass(self):
        report = validate_state.build_report(
            _feature(VALIDATION.replace("killed the mutant", "mutant survived"))
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("survived" in e for e in report.errors))


class FilesFamilyTest(unittest.TestCase):
    def test_files_none_fails(self):
        tasks = TASKS.replace("src/auth/token.ts", "none", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Files" in e for e in report.errors))

    def test_dot_slash_overlaps(self):
        report = validate_tasks.build_report(
            "tasks.md", _two_independent("./src/auth/token.ts", "src/auth/token.ts")
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("both write" in e for e in report.errors))

    def test_leading_slash_overlaps(self):
        report = validate_tasks.build_report(
            "tasks.md", _two_independent("/src/auth/token.ts", "src/auth/token.ts")
        )
        self.assertFalse(report.passed)

    def test_parent_relative_overlaps(self):
        report = validate_tasks.build_report(
            "tasks.md", _two_independent("../src/auth/token.ts", "src/auth/token.ts")
        )
        self.assertFalse(report.passed)

    def test_quoted_paths_overlap(self):
        report = validate_tasks.build_report(
            "tasks.md",
            _two_independent("`src/auth/token.ts`", '"src/auth/token.ts"'),
        )
        self.assertFalse(report.passed)

    def test_markdown_link_overlaps(self):
        report = validate_tasks.build_report(
            "tasks.md",
            _two_independent("[token](src/auth/token.ts)", "src/auth/token.ts"),
        )
        self.assertFalse(report.passed)

    def test_casefold_overlaps(self):
        report = validate_tasks.build_report(
            "tasks.md",
            _two_independent("src/Auth/Token.ts", "src/auth/token.ts"),
        )
        self.assertFalse(report.passed)

    def test_normalize_helper_is_shared(self):
        self.assertEqual(
            _common.normalize_file_path("[x](./Src/A.ts)"),
            "src/a.ts",
        )
        self.assertEqual(
            _common.visible_markdown("a\n```\nb\n```\nc"),
            "a\n\n\n\nc",
        )


class PassAlignFamilyTest(unittest.TestCase):
    def test_open_gaps_block_pass(self):
        report = validate_state.build_report(
            _feature(VALIDATION + "\n## Gaps\n- login still flaky\n")
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Gaps" in e for e in report.errors))

    def test_security_fail_blocks_pass(self):
        report = validate_state.build_report(
            _feature(
                VALIDATION
                + "\n## Security Review\n- Result: fail\n- XSS unfixed\n"
            )
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("Security Review" in e for e in report.errors))

    def test_gaps_none_allows_pass(self):
        report = validate_state.build_report(
            _feature(VALIDATION + "\n## Gaps\n- none\n")
        )
        self.assertTrue(report.passed, report.errors)

    def test_gaps_bold_none_allows_pass(self):
        report = validate_state.build_report(
            _feature(VALIDATION + "\n## Gaps\n- **none**\n")
        )
        self.assertTrue(report.passed, report.errors)

    def test_gaps_italic_none_allows_pass(self):
        report = validate_state.build_report(
            _feature(VALIDATION + "\n## Gaps\n- *none*\n")
        )
        self.assertTrue(report.passed, report.errors)


class SpecTasksFamilyTest(unittest.TestCase):
    def test_req_outside_requirements_ignored(self):
        spec = SPEC + "\n### NOTE-001: Future work\n- deferred\n"
        # NOTE under Out of Scope (appended after OOS body)
        self.assertEqual(_common.requirement_ids(spec), ["REQ-001"])
        report = validate_tasks.build_report(
            "tasks.md", TASKS, spec_text=spec
        )
        self.assertTrue(report.passed, report.errors)

    def test_assumption_note_ignored(self):
        spec = SPEC.replace(
            "## Assumptions\n- none\n",
            "## Assumptions\n### NOTE-002: Assumed SLA\n- assumed\n",
        )
        self.assertEqual(_common.requirement_ids(spec), ["REQ-001"])
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(
            [req_id for req_id, _, _ in validate_spec.split_requirements(spec)],
            ["REQ-001"],
        )

    def test_req_outside_requirements_ignored_by_validate_spec(self):
        spec = SPEC + "\n### NOTE-001: Future work\n- deferred\n"
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)
        self.assertEqual(
            [req_id for req_id, _, _ in validate_spec.split_requirements(spec)],
            ["REQ-001"],
        )

    def test_tests_none_fails(self):
        tasks = TASKS.replace("test/auth/token.test.ts", "none", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Tests" in e for e in report.errors))

    def test_gate_none_fails(self):
        tasks = TASKS.replace("- **Gate**: npm test\n", "- **Gate**: none\n", 1)
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Gate" in e for e in report.errors))

    def test_done_when_dash_fails(self):
        tasks = TASKS.replace(
            "module signs and verifies tokens", "—", 1
        )
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("Done When" in e for e in report.errors))

    def test_html_comment_requirements_section_does_not_count(self):
        spec = """# Spec

## Goal
Hidden requirements must not count from HTML comments.

<!--
## Requirements
### REQ-001: Hidden
- WHEN x THEN the system SHALL y
-->
## Assumptions
- none
## Out of Scope
- none
"""
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)
        self.assertTrue(any("Requirements" in e for e in report.errors))

    def test_html_comment_task_does_not_count(self):
        tasks = """# Tasks
<!--
### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: t.ts
- **Gate**: npm test
- **Done when**: tokens sign
-->
"""
        report = validate_tasks.build_report("tasks.md", tasks)
        self.assertFalse(report.passed)
        self.assertTrue(any("no tasks found" in e for e in report.errors))

    def test_html_comment_todo_is_not_a_placeholder(self):
        spec = SPEC.replace(
            "- Social login",
            "- Social login <!-- TODO: maybe later -->",
        )
        report = validate_spec.build_report("spec.md", spec)
        self.assertTrue(report.passed, report.errors)

    def test_table_only_shall_is_not_a_criterion(self):
        spec = """# Spec
## Requirements
### REQ-001: Email login
| When | Then |
| --- | --- |
| login | system SHALL create session |
## Assumptions
- none
## Out of Scope
- none
"""
        report = validate_spec.build_report("spec.md", spec)
        self.assertFalse(report.passed)


class SuppressionBypassTest(unittest.TestCase):
    """Agents must not silence linters or skip hooks in staged diffs."""

    def test_noqa_in_added_line_is_blocked(self):
        diff = "+++ b/src/app.py\n+    x = 1  # noqa\n"
        report = check_suppressions.build_report(
            diff,
            check_suppressions.DEFAULT_SUPPRESSION_PATTERNS,
        )
        self.assertFalse(report.passed)
        self.assertTrue(any("noqa" in e.lower() for e in report.errors))

    def test_clean_added_line_passes(self):
        diff = "+++ b/src/app.py\n+    x = 1\n"
        report = check_suppressions.build_report(
            diff,
            check_suppressions.DEFAULT_SUPPRESSION_PATTERNS,
        )
        self.assertTrue(report.passed)


class StagedCommitPolicyTest(unittest.TestCase):
    def test_empty_staged_commit_is_blocked(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subprocess.run(["git", "init", "--quiet"], cwd=root, check=True)
            report = check_commit.build_staged_report(root)
            self.assertFalse(report.passed)
            self.assertTrue(any("empty commit" in e.lower() for e in report.errors))


if __name__ == "__main__":
    unittest.main()
