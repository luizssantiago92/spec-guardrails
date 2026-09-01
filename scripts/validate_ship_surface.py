#!/usr/bin/env python3
"""Ship Surface + AI Surface structural gate for python-platform teams.

Run after Tasks (before Execute) and again before Verify when infra or AI paths
are listed in task Files:

    python3 validate_ship_surface.py auth
    python3 validate_ship_surface.py .specs/features/003-rag-api

Checks (markdown structure only — not deploy safety or eval quality):
  * when task Files match infra_globs → design.md ## Ship Surface with required fields
  * when task Files match ai_globs → design.md ## AI Surface with Eval harness + Fallback
  * fields must be non-empty and not placeholder tokens

Limitations (documented honestly):
  * does not run terraform plan, helm diff, or live LLM eval
  * does not validate semantic correctness of rollback or fallback strategies
  * globs are configurable via ship_surface.infra_globs / ai_globs in .specs/config.yaml

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import fnmatch
import re
import sys
from pathlib import Path

from _common import Report, resolve_feature_dir, visible_markdown
from _project_config import load_ship_surface_config
from validate_tasks import parse_files

GATE = "validate-ship-surface"

SHIP_SECTION = re.compile(r"^##\s+Ship\s+Surface\s*$", re.MULTILINE | re.IGNORECASE)
AI_SECTION = re.compile(r"^##\s+AI\s+Surface\s*$", re.MULTILINE | re.IGNORECASE)
NEXT_SECTION = re.compile(r"^##\s+", re.MULTILINE)

SHIP_REQUIRED_FIELDS = ("Deploy unit", "CI", "Rollback")
AI_REQUIRED_FIELDS = ("Eval harness", "Fallback / degrade")

FIELD_LINE = re.compile(
    r"^\s*(?:[-*]\s*)?\*{0,2}(?P<key>[^|*\n]+?)\*{0,2}\s*:\s*(?P<value>.+?)\s*$",
    re.MULTILINE,
)
TABLE_ROW = re.compile(
    r"^\s*\|\s*(?P<key>[^|]+?)\s*\|\s*(?P<value>[^|]+?)\s*\|\s*$",
    re.MULTILINE,
)

PLACEHOLDER_VALUES = frozenset(
    {
        "",
        "—",
        "-",
        "n/a",
        "na",
        "none",
        "tbd",
        "todo",
        "(fill in)",
        "(fill me)",
    }
)


def extract_section(text: str, heading: re.Pattern[str]) -> str | None:
    match = heading.search(text)
    if not match:
        return None
    start = match.end()
    rest = text[start:]
    next_heading = NEXT_SECTION.search(rest)
    end = start + next_heading.start() if next_heading else len(text)
    return text[start:end]


def parse_surface_fields(section_text: str | None) -> dict[str, str]:
    if not section_text:
        return {}

    fields: dict[str, str] = {}
    visible = visible_markdown(section_text)

    for match in FIELD_LINE.finditer(visible):
        key = match.group("key").strip().strip("*")
        value = match.group("value").strip().strip("*")
        if key.lower() in {"field", "key", "---"}:
            continue
        fields[key] = value

    for match in TABLE_ROW.finditer(visible):
        key = match.group("key").strip()
        value = match.group("value").strip()
        if key.lower() in {"field", "key", "---"}:
            continue
        fields[key] = value

    return fields


def is_placeholder(value: str) -> bool:
    cleaned = value.strip().strip("`").lower()
    if cleaned in PLACEHOLDER_VALUES:
        return True
    return cleaned.startswith("(fill")


def normalize_path(path: str) -> str:
    return path.replace("\\", "/").lstrip("./")


def path_matches_globs(file_path: str, globs: list[str]) -> bool:
    normalized = normalize_path(file_path)
    name = Path(normalized).name
    for pattern in globs:
        pat = pattern.replace("\\", "/").lstrip("./")
        if fnmatch.fnmatch(normalized, pat) or fnmatch.fnmatch(name, pat):
            return True
        if pat.endswith("/**"):
            prefix = pat[:-3].rstrip("/")
            if normalized == prefix or normalized.startswith(f"{prefix}/"):
                return True
        tail = pat.rsplit("/", 1)[-1]
        if tail and tail != "**" and "*" in tail and fnmatch.fnmatch(name, tail):
            return True
    return False


def collect_task_files(tasks_text: str) -> list[str]:
    files: list[str] = []
    for match in FIELD_LINE.finditer(tasks_text):
        if match.group("key").strip().lower() != "files":
            continue
        files.extend(parse_files(match.group("value")))
    return files


def find_field(fields: dict[str, str], *candidates: str) -> str | None:
    lowered = {key.lower(): value for key, value in fields.items()}
    for candidate in candidates:
        value = lowered.get(candidate.lower())
        if value is not None:
            return value
    return None


def missing_required(fields: dict[str, str], required: tuple[str, ...]) -> list[str]:
    missing: list[str] = []
    for name in required:
        value = find_field(fields, name)
        if value is None or is_placeholder(value):
            missing.append(name)
    return missing


def read_optional(feature_dir: Path, filename: str) -> str | None:
    path = feature_dir / filename
    if not path.is_file():
        return None
    text = path.read_text(encoding="utf-8")
    return text if text.strip() else None


def build_report(feature_dir: Path, cwd: Path | None = None) -> Report:
    report = Report(gate=GATE, target=str(feature_dir))
    config = load_ship_surface_config(cwd or feature_dir.parent.parent.parent)
    infra_globs = config["infra_globs"]
    ai_globs = config["ai_globs"]

    tasks_text = read_optional(feature_dir, "tasks.md")
    if not tasks_text:
        report.warn("tasks.md missing — skipping ship/AI surface checks")
        return report

    task_files = collect_task_files(tasks_text)
    if not task_files:
        report.warn("no Files paths in tasks.md — skipping ship/AI surface checks")
        return report

    needs_ship = any(path_matches_globs(path, infra_globs) for path in task_files)
    needs_ai = any(path_matches_globs(path, ai_globs) for path in task_files)

    if not needs_ship and not needs_ai:
        report.ok("no infra or AI paths in task Files — gate not required")
        return report

    design_text = read_optional(feature_dir, "design.md")
    if not design_text:
        report.error("design.md missing or empty — required when tasks touch infra or AI paths")
        return report

    if needs_ship:
        ship_fields = parse_surface_fields(extract_section(design_text, SHIP_SECTION))
        if not ship_fields:
            report.error("design.md missing or empty — required when tasks touch infra or AI paths")
        else:
            report.ok(f"Ship Surface: {len(ship_fields)} field(s) parsed")
            for field in missing_required(ship_fields, SHIP_REQUIRED_FIELDS):
                report.error(f"Ship Surface missing or placeholder field: {field}")

    if needs_ai:
        ai_fields = parse_surface_fields(extract_section(design_text, AI_SECTION))
        if not ai_fields:
            report.error("## AI Surface missing or empty in design.md")
        else:
            report.ok(f"AI Surface: {len(ai_fields)} field(s) parsed")
            for field in missing_required(ai_fields, AI_REQUIRED_FIELDS):
                report.error(f"AI Surface missing or placeholder field: {field}")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Ship Surface and AI Surface in design.md")
    parser.add_argument(
        "feature",
        nargs="?",
        help="Feature id, slug, or path to .specs/features/<feature>",
    )
    args = parser.parse_args(argv)

    try:
        feature_dir = resolve_feature_dir(args.feature)
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        return 2

    cwd = feature_dir.parent.parent.parent
    report = build_report(feature_dir, cwd)
    return report.emit()


if __name__ == "__main__":
    sys.exit(main())
