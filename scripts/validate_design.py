#!/usr/bin/env python3
"""Structural gate for design.md on Complex-tier features.

Run before Tasks approval when design.md exists:

    python3 validate_design.py auth
    python3 validate_design.py .specs/features/003-auth

Checks (markdown structure only):
  * When design.md exists and the feature is Complex-tier, required sections:
    Context, Decision, Alternatives considered, Risks
  * Sections must be non-empty (not scaffold placeholders)

Skip when design.md is absent (Design phase was skipped legitimately).

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from _common import Report, resolve_feature_dir, section_body, visible_markdown
from validate_state import is_medium_plus

GATE = "validate-design"

REQUIRED_SECTIONS = (
    ("Context", re.compile(r"^(?P<level>#{2,6})\s*Context\b", re.MULTILINE | re.IGNORECASE)),
    (
        "Decision",
        re.compile(r"^(?P<level>#{2,6})\s*Decision\b", re.MULTILINE | re.IGNORECASE),
    ),
    (
        "Alternatives considered",
        re.compile(
            r"^(?P<level>#{2,6})\s*Alternatives\s+considered\b",
            re.MULTILINE | re.IGNORECASE,
        ),
    ),
    ("Risks", re.compile(r"^(?P<level>#{2,6})\s*Risks\b", re.MULTILINE | re.IGNORECASE)),
)

PLACEHOLDER_ONLY = re.compile(
    r"^\s*[-*]?\s*(\.{3}|…|tbd|todo|n/a|none|\(fill.*\))\s*$",
    re.IGNORECASE,
)

COMPLEX_TASK_FLOOR = 10
TASK_HEADING = re.compile(r"^#{2,6}\s*T\d{1,6}\b", re.MULTILINE | re.IGNORECASE)


def is_complex_feature(feature_dir: Path) -> bool:
    """Complex when design is in play, Discuss ran, or task count hits Complex router."""

    if (feature_dir / "context.md").is_file():
        return True

    design_path = feature_dir / "design.md"
    if design_path.is_file() and design_path.read_text(encoding="utf-8").strip():
        return True

    tasks_path = feature_dir / "tasks.md"
    if tasks_path.is_file():
        tasks = tasks_path.read_text(encoding="utf-8")
        if len(TASK_HEADING.findall(tasks)) >= COMPLEX_TASK_FLOOR:
            return True

    spec_path = feature_dir / "spec.md"
    if spec_path.is_file():
        spec = spec_path.read_text(encoding="utf-8")
        if re.search(r"^##\s*Complexity\s*:\s*Complex\b", spec, re.MULTILINE | re.IGNORECASE):
            return True

    return False


def section_nonempty(body: str | None) -> bool:
    if not body or not body.strip():
        return False
    lines = [
        line.strip()
        for line in body.splitlines()
        if line.strip() and not line.strip().startswith("<!--")
    ]
    if not lines:
        return False
    substantive = [line for line in lines if not PLACEHOLDER_ONLY.match(line)]
    return len(substantive) > 0


def build_report(feature_dir: Path) -> Report:
    report = Report(gate=GATE, target=str(feature_dir))
    design_path = feature_dir / "design.md"

    if not design_path.is_file():
        report.ok("design.md absent — Design phase skipped; gate not applicable")
        return report

    text = design_path.read_text(encoding="utf-8")
    if not text.strip():
        if is_complex_feature(feature_dir) or is_medium_plus(feature_dir):
            report.error("design.md exists but is empty on a Complex/Medium+ feature")
        else:
            report.warn("design.md is empty — add content or remove the file")
        return report

    if not (is_complex_feature(feature_dir) or is_medium_plus(feature_dir)):
        report.ok("design.md present — below Complex/Medium+ tier; sections optional")
        return report

    visible = visible_markdown(text)
    for title, heading in REQUIRED_SECTIONS:
        body = section_body(visible, heading)
        if body is None:
            report.error(f"missing required section: ## {title}")
            continue
        if section_nonempty(body):
            report.ok(f"section present: {title}")
        else:
            report.error(f"## {title} is empty or placeholder-only")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate design.md structure")
    parser.add_argument(
        "feature",
        nargs="?",
        help="feature name, feature directory, or path to design.md",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as blocking failures",
    )
    args = parser.parse_args(argv)

    if args.feature and args.feature.endswith("design.md"):
        feature_dir = Path(args.feature).parent
    else:
        feature_dir = resolve_feature_dir(args.feature, GATE)

    report = build_report(feature_dir)
    return report.emit(strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
