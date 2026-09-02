#!/usr/bin/env python3
"""Compare requirements brief capabilities against formal spec REQ coverage.

    python3 req_analysis_diff.py auth
    python3 req_analysis_diff.py --brief .specs/project/feature-briefs/auth/requirements-brief.md --spec .specs/features/003-auth/spec.md

Reports brief bullets from ## Capabilities that have no obvious REQ mapping in spec.md.
Structural heuristic only — not semantic alignment.

Exit codes: 0 pass (no drift or only warnings), 1 drift found, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from _common import Report, requirement_ids, resolve_feature_dir, visible_markdown
from validate_req_analysis import FEATURE_BRIEFS, PROJECT_BRIEF, section_body as brief_section

GATE = "req-analysis-diff"

BULLET = re.compile(r"^\s*[-*]\s+(.+?)\s*$", re.MULTILINE)


def feature_slug(feature_dir: Path) -> str:
    name = feature_dir.name
    return re.sub(r"^\d{3}-", "", name)


def resolve_brief_for_feature(feature_dir: Path, root: Path) -> Path | None:
    slug = feature_slug(feature_dir)
    feature_brief = root / FEATURE_BRIEFS / slug / "requirements-brief.md"
    if feature_brief.is_file():
        return feature_brief
    project_brief = root / PROJECT_BRIEF
    if project_brief.is_file():
        return project_brief
    return None


def capability_bullets(brief_text: str) -> list[str]:
    body = brief_section(brief_text, "Capabilities")
    if not body:
        return []
    bullets: list[str] = []
    for match in BULLET.finditer(body):
        item = match.group(1).strip()
        if item and not item.startswith("("):
            bullets.append(item)
    return bullets


def tokenize(text: str) -> set[str]:
    return {word.lower() for word in re.findall(r"[A-Za-z]{4,}", text)}


def bullet_covered(bullet: str, spec_text: str, req_ids: list[str]) -> bool:
    bullet_tokens = tokenize(bullet)
    if not bullet_tokens:
        return True
    spec_lower = spec_text.lower()
    overlap = sum(1 for token in bullet_tokens if token in spec_lower)
    if overlap >= max(1, len(bullet_tokens) // 2):
        return True
    for req_id in req_ids:
        if req_id.lower() in bullet.lower():
            return True
    return False


def build_report(brief_path: Path, spec_path: Path) -> Report:
    report = Report(gate=GATE, target=f"{brief_path.as_posix()} ↔ {spec_path.as_posix()}")
    brief_text = brief_path.read_text(encoding="utf-8")
    spec_text = spec_path.read_text(encoding="utf-8")
    bullets = capability_bullets(brief_text)
    if not bullets:
        report.warn("brief has no ## Capabilities bullets to compare")
        return report

    ids = requirement_ids(visible_markdown(spec_text))
    uncovered: list[str] = []
    for bullet in bullets:
        if bullet_covered(bullet, spec_text, ids):
            report.ok(f"brief capability mapped: {bullet[:60]}")
        else:
            uncovered.append(bullet)

    if uncovered:
        for item in uncovered:
            report.error(f"brief capability has no REQ mapping in spec: {item}")
    else:
        report.ok("all brief capabilities have heuristic REQ coverage")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Diff requirements brief vs spec.md")
    parser.add_argument("feature", nargs="?", help="feature name or directory")
    parser.add_argument("--brief", help="path to requirements-brief.md")
    parser.add_argument("--spec", help="path to spec.md")
    args = parser.parse_args(argv)

    root = Path.cwd()
    if args.brief and args.spec:
        brief_path = Path(args.brief)
        spec_path = Path(args.spec)
    else:
        feature_dir = resolve_feature_dir(args.feature, GATE)
        spec_path = feature_dir / "spec.md"
        brief_path = resolve_brief_for_feature(feature_dir, root)
        if brief_path is None:
            print(f"[{GATE}] USAGE - no requirements brief found for feature", file=sys.stderr)
            return 2

    if not brief_path.is_file() or not spec_path.is_file():
        print(f"[{GATE}] USAGE - brief or spec file missing", file=sys.stderr)
        return 2

    report = build_report(brief_path, spec_path)
    return report.emit()


if __name__ == "__main__":
    sys.exit(main())
