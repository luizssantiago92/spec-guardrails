#!/usr/bin/env python3
"""Cross-artifact consistency gate for a feature.

Run after Tasks (and optionally before Implement):

    python3 analyze_artifacts.py auth
    python3 analyze_artifacts.py .specs/features/003-chat-system

Checks structural alignment across spec.md, tasks.md, design.md, and STATE.md:
  * every spec requirement ID appears in at least one task Requirement field
  * every task Requirement references a spec requirement ID (when spec exists)
  * open [NEEDS CLARIFICATION] markers (warning; blocking with --strict)
  * STATE Active Feature branch matches current git branch when git is available
  * design.md with only whitespace when tasks imply architecture (warning)

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from _common import (
    Report,
    requirement_ids,
    resolve_feature_dir,
    visible_markdown,
)

GATE = "analyze-artifacts"
CLARIFICATION = re.compile(r"\[NEEDS CLARIFICATION(?:\s*:\s*[^\]]+)?\]", re.IGNORECASE)
TASK_FIELD = re.compile(
    r"^\s*[-*]?\s*\*{0,2}(?P<key>[A-Za-z][A-Za-z ]+?)\*{0,2}\s*:\s*(?P<value>.+?)\s*$",
    re.MULTILINE,
)
REQUIREMENT_REF = re.compile(r"\b[A-Z][A-Z0-9]{1,9}-\d{2,4}\b")
STATE_BRANCH = re.compile(
    r"^\s*-\s*Branch:\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)
STATE_FEATURE = re.compile(
    r"^\s*-\s*Feature:\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)
TASK_HEADING = re.compile(
    r"^#{2,6}\s*(?P<id>T\d{1,6})\s*[:\-–]?\s*(?P<title>.*)$",
    re.MULTILINE | re.IGNORECASE,
)
VERIFY_HINT = re.compile(
    r"\b(test strategy|verification|validate\.md|/verify|acceptance test)\b",
    re.IGNORECASE,
)
MEDIUM_TASK_FLOOR = 5


def git_branch(root: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=root,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return None

    if result.returncode != 0:
        return None

    branch = result.stdout.strip()
    return branch or None


def task_requirement_ids(tasks_text: str) -> set[str]:
    ids: set[str] = set()
    for match in TASK_FIELD.finditer(tasks_text):
        if match.group("key").strip().lower() != "requirement":
            continue
        ids.update(REQUIREMENT_REF.findall(match.group("value")))
    return ids


def read_optional(feature_dir: Path, filename: str) -> str | None:
    path = feature_dir / filename
    if not path.is_file():
        return None
    text = path.read_text(encoding="utf-8")
    return text if text.strip() else None


def build_report(feature_dir: Path, root: Path) -> Report:
    report = Report(gate=GATE, target=str(feature_dir))
    spec_text = read_optional(feature_dir, "spec.md")
    tasks_text = read_optional(feature_dir, "tasks.md")
    design_text = read_optional(feature_dir, "design.md")
    state_path = root / ".specs/STATE.md"

    if spec_text:
        spec_ids = requirement_ids(spec_text)
        report.ok(f"{len(spec_ids)} requirement ID(s) in spec.md")
    else:
        spec_ids = []
        report.warn("spec.md missing or empty — REQ coverage checks skipped")

    if tasks_text:
        covered = task_requirement_ids(tasks_text)
        report.ok(f"{len(covered)} requirement ID(s) referenced in tasks.md")

        if spec_ids:
            missing = [req for req in spec_ids if req not in covered]
            if missing:
                report.error(
                    "requirements without task coverage: "
                    + ", ".join(missing)
                )
            else:
                report.ok("every spec requirement is referenced by a task")

            orphan_tasks = sorted(covered - set(spec_ids))
            if orphan_tasks:
                report.error(
                    "tasks reference unknown requirement IDs: "
                    + ", ".join(orphan_tasks)
                )
    else:
        report.warn("tasks.md missing or empty — task coverage checks skipped")

    task_count = len(TASK_HEADING.findall(tasks_text or ""))
    medium_plus = task_count >= MEDIUM_TASK_FLOOR

    if medium_plus and design_text is None:
        report.warn(
            f"{task_count} tasks — design.md recommended for Medium+ features"
        )

    plan_text = "\n".join(filter(None, [spec_text, design_text]))
    if medium_plus and plan_text and not VERIFY_HINT.search(plan_text):
        report.warn(
            "no verification or test strategy mention in spec/design — add verify plan before Execute"
        )

    if design_text is not None and tasks_text:
        visible_design = visible_markdown(design_text).strip()
        if len(visible_design.splitlines()) < 5:
            report.warn(
                "design.md exists but looks empty — Complex work should document architecture"
            )

    searchable = "\n".join(filter(None, [spec_text, tasks_text, design_text]))
    if searchable:
        markers = CLARIFICATION.findall(searchable)
        if markers:
            report.warn(
                f"{len(markers)} open [NEEDS CLARIFICATION] marker(s) — resolve before approval"
            )
        else:
            report.ok("no open [NEEDS CLARIFICATION] markers")

    if state_path.is_file():
        state = state_path.read_text(encoding="utf-8")
        feature_match = STATE_FEATURE.search(state)
        branch_match = STATE_BRANCH.search(state)

        if feature_match:
            state_feature = feature_match.group(1).strip()
            if state_feature not in {"—", "-", "none"} and state_feature != feature_dir.name:
                report.warn(
                    f"STATE.md Active Feature ({state_feature}) differs from "
                    f"analyzed feature ({feature_dir.name})"
                )

        current = git_branch(root)
        if branch_match and current:
            state_branch = branch_match.group(1).strip()
            if state_branch not in {"—", "-", "none"} and state_branch != current:
                report.warn(
                    f"STATE.md branch ({state_branch}) differs from git ({current}) — reconcile"
                )
            elif state_branch == current:
                report.ok("STATE branch matches current git branch")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Analyze cross-artifact consistency")
    parser.add_argument(
        "feature",
        nargs="?",
        help="feature name, feature directory, or path to spec.md",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as blocking failures",
    )
    args = parser.parse_args(argv)

    feature_dir = resolve_feature_dir(args.feature, GATE)
    report = build_report(feature_dir, Path("."))
    return report.emit(strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
