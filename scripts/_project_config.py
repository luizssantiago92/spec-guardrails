"""Project config helpers for quality checks and suppression patterns."""

from __future__ import annotations

import re
from pathlib import Path

CONFIG_RELATIVE = Path(".specs") / "config.yaml"

DEFAULT_SUPPRESSION_PATTERNS = [
    r"#\s*noqa\b",
    r"nosemgrep\b",
    r"eslint-disable(?:-next-line|-line)?",
    r"@ts-ignore\b",
    r"@ts-expect-error\b",
    r"\bxit\s*\(",
    r"\bxdescribe\s*\(",
    r"\bpytest\.mark\.skip\b",
    r"--no-verify\b",
]

DEFAULT_MAX_STAGED_LINES = 500


def config_path(cwd: Path | str | None = None) -> Path:
    root = Path(cwd) if cwd is not None else Path.cwd()
    return root / CONFIG_RELATIVE


def _parse_scalar(raw: str):
    value = raw.strip().strip("'\"")
    lower = value.lower()
    if lower in {"true", "yes", "on"}:
        return True
    if lower in {"false", "no", "off"}:
        return False
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    return value


def _parse_list_block(lines: list[str], start_index: int, parent_indent: int) -> tuple[list[str], int]:
    items: list[str] = []
    index = start_index
    while index < len(lines):
        line = lines[index]
        if not line.strip() or line.lstrip().startswith("#"):
            index += 1
            continue
        indent = len(line) - len(line.lstrip())
        if indent <= parent_indent:
            break
        match = re.match(r"^\s*-\s+(.+)$", line)
        if match:
            items.append(_parse_scalar(match.group(1)))
        index += 1
    return items, index


def load_project_config(cwd: Path | str | None = None) -> dict:
    """Return quality, suppressions, and commit policy blocks with defaults."""

    config = {
        "quality": {"checks": []},
        "suppressions": {"patterns": list(DEFAULT_SUPPRESSION_PATTERNS)},
        "commit": {"max_staged_lines": DEFAULT_MAX_STAGED_LINES},
    }

    path = config_path(cwd)
    if not path.is_file():
        return config

    lines = path.read_text(encoding="utf-8").splitlines()
    section = None
    section_indent = 0

    index = 0
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            index += 1
            continue

        indent = len(line) - len(line.lstrip())

        if stripped == "quality:":
            section = "quality"
            section_indent = indent
            index += 1
            continue

        if stripped == "suppressions:":
            section = "suppressions"
            section_indent = indent
            index += 1
            continue

        if stripped == "commit:":
            section = "commit"
            section_indent = indent
            index += 1
            continue

        if section and indent <= section_indent and not stripped.endswith(":"):
            section = None

        if section == "quality" and stripped == "checks:":
            items, index = _parse_list_block(lines, index + 1, indent)
            config["quality"]["checks"] = items
            continue

        if section == "suppressions" and stripped == "patterns:":
            items, index = _parse_list_block(lines, index + 1, indent)
            if items:
                config["suppressions"]["patterns"] = items
            continue

        if section == "commit":
            match = re.match(r"^max_staged_lines:\s*(.+)$", stripped)
            if match:
                config["commit"]["max_staged_lines"] = int(_parse_scalar(match.group(1)))

        index += 1

    return config
