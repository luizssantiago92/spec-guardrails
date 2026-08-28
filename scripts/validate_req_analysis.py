#!/usr/bin/env python3
"""Structural gate for requirements briefs produced by /elicit.

    python3 validate_req_analysis.py .specs/project/requirements-brief.md
    python3 validate_req_analysis.py .specs/project/feature-briefs/settings-page/requirements-brief.md

Checks (markdown structure only):
  * Required sections: Goal, Context sources, Owner approval
  * Context sources lists at least one non-placeholder entry
  * Open questions is empty or explicitly "- none"
  * Owner approval indicates yes with a date
  * No [NEEDS CLARIFICATION] or [OPEN QUESTION] markers remain

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from _common import Report, visible_markdown

GATE = "validate-req-analysis"
PROJECT_DIR = Path(".specs/project")
PROJECT_BRIEF = PROJECT_DIR / "requirements-brief.md"
FEATURE_BRIEFS = PROJECT_DIR / "feature-briefs"

HEADING = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
APPROVAL_YES = re.compile(
    r"\b(?:approved|approval)\b[^\n]*:\s*(?:yes|approved|true)\b",
    re.IGNORECASE,
)
APPROVAL_DATE = re.compile(
    r"\bdate\b\s*:\s*(\d{4}-\d{2}-\d{2}|YYYY-MM-DD)",
    re.IGNORECASE,
)
OPEN_NONE = re.compile(r"^\s*[-*]\s*(?:none|n/a)\s*$", re.IGNORECASE | re.MULTILINE)
CLARIFICATION = re.compile(r"\[(?:NEEDS CLARIFICATION|OPEN QUESTION)\]", re.IGNORECASE)
PLACEHOLDER_SOURCE = re.compile(
    r"^\s*[-*]\s*\(\s*list every file",
    re.IGNORECASE | re.MULTILINE,
)


def _fail_usage(message: str, target: str = ".") -> None:
    print(f"[{GATE}] USAGE - {message}", file=sys.stderr)
    raise SystemExit(2)


def resolve_brief_path(raw: str | None, root: Path = Path(".")) -> Path:
    if not raw:
        candidate = root / PROJECT_BRIEF
        if candidate.is_file():
            return candidate
        _fail_usage(
            "no brief path given and .specs/project/requirements-brief.md is missing",
            str(PROJECT_BRIEF),
        )

    candidate = Path(raw).expanduser()
    if candidate.is_absolute():
        brief = candidate
    else:
        brief = root / candidate

    if not brief.is_file():
        _fail_usage(f"no such requirements brief: {raw}", raw or str(PROJECT_BRIEF))

    rel = brief.resolve()
    project_root = (root / PROJECT_DIR).resolve()
    try:
        rel.relative_to(project_root)
    except ValueError:
        _fail_usage(
            f"brief must live under {PROJECT_DIR.as_posix()}/",
            str(brief),
        )

    if brief.name != "requirements-brief.md":
        _fail_usage(
            "expected a requirements-brief.md file under .specs/project/",
            str(brief),
        )

    return brief


def section_body(text: str, title: str) -> str:
    match = HEADING.search(text)
    if not match:
        return ""

    pattern = re.compile(
        rf"^##\s+{re.escape(title)}\s*$",
        re.MULTILINE | re.IGNORECASE,
    )
    start = pattern.search(text)
    if not start:
        return ""

    rest = text[start.end() :]
    next_heading = HEADING.search(rest)
    body = rest[: next_heading.start()] if next_heading else rest
    return body.strip()


def build_report(brief_path: Path) -> Report:
    report = Report(GATE, brief_path.as_posix())
    text = brief_path.read_text(encoding="utf-8")
    visible = visible_markdown(text)

    for section in ("Goal", "Context sources", "Owner approval"):
        if not section_body(text, section):
            report.error(f"missing ## {section} section")

    goal_body = section_body(text, "Goal")
    if goal_body and len(goal_body.strip()) < 8:
        report.error("Goal section is too short to be actionable")

    sources_body = section_body(text, "Context sources")
    if sources_body:
        if PLACEHOLDER_SOURCE.search(sources_body):
            report.error("Context sources still contains the scaffold placeholder")
        elif not re.search(r"^\s*[-*]\s+\S", sources_body, re.MULTILINE):
            report.error("Context sources must list at least one bullet entry")
        else:
            report.ok("Context sources lists at least one entry")
    else:
        report.error("Context sources section is empty")

    open_body = section_body(text, "Open questions")
    if open_body:
        bullets = [
            line.strip()
            for line in open_body.splitlines()
            if line.strip().startswith(("-", "*"))
        ]
        if bullets and not all(OPEN_NONE.match(line) for line in bullets):
            report.error(
                'Open questions must be "- none" or empty before /specify'
            )
        else:
            report.ok("Open questions closed")
    else:
        report.ok("Open questions section absent or empty")

    approval_body = section_body(text, "Owner approval")
    if approval_body:
        if not APPROVAL_YES.search(approval_body):
            report.error('Owner approval must include "Approved: yes" (or equivalent)')
        if APPROVAL_DATE.search(approval_body) and "YYYY-MM-DD" in approval_body:
            report.error("Owner approval date is still the scaffold placeholder")
        elif not re.search(r"\d{4}-\d{2}-\d{2}", approval_body):
            report.warn("Owner approval has no YYYY-MM-DD date")
        else:
            report.ok("Owner approval recorded")
    else:
        report.error("Owner approval section is empty")

    if CLARIFICATION.search(visible):
        report.error("[NEEDS CLARIFICATION] or [OPEN QUESTION] marker remains")
    else:
        report.ok("no clarification markers in brief")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a requirements brief from /elicit")
    parser.add_argument(
        "brief",
        nargs="?",
        help="Path to requirements-brief.md (default: .specs/project/requirements-brief.md)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat warnings as blocking failures",
    )
    args = parser.parse_args(argv)

    brief = resolve_brief_path(args.brief)
    report = build_report(brief)
    return report.emit(strict=args.strict)


if __name__ == "__main__":
    raise SystemExit(main())
