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

DEFAULT_INFRA_GLOBS = [
    "**/Dockerfile",
    "**/docker-compose*.yml",
    "**/docker-compose*.yaml",
    "**/terraform/**",
    "**/*.tf",
    "**/charts/**",
    "**/helm/**",
    "**/.github/workflows/**",
]

DEFAULT_AI_GLOBS = [
    "**/prompts/**",
    "**/mcp/**",
    "**/evals/**",
    "**/tests/eval/**",
    "**/*embed*",
    "**/*llm*",
    "**/*rag*",
]


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
        "ship_surface": {
            "infra_globs": list(DEFAULT_INFRA_GLOBS),
            "ai_globs": list(DEFAULT_AI_GLOBS),
        },
        "elicitation": {
            "require_brief": False,
            "require_brief_complex": True,
            "require_nfr_complex": "warn",
            "require_test_plan_complex": "warn",
        },
        "converge": {
            "every_n_tasks": 5,
            "mode": "suggest",
        },
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

        if stripped == "ship_surface:":
            section = "ship_surface"
            section_indent = indent
            index += 1
            continue

        if stripped == "elicitation:":
            section = "elicitation"
            section_indent = indent
            index += 1
            continue

        if stripped == "converge:":
            section = "converge"
            section_indent = indent
            index += 1
            continue

        if section and indent <= section_indent and not stripped.endswith(":"):
            section = None

        if section == "ship_surface" and stripped == "infra_globs:":
            items, index = _parse_list_block(lines, index + 1, indent)
            if items:
                config["ship_surface"]["infra_globs"] = items
            continue

        if section == "ship_surface" and stripped == "ai_globs:":
            items, index = _parse_list_block(lines, index + 1, indent)
            if items:
                config["ship_surface"]["ai_globs"] = items
            continue

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

        if section == "elicitation":
            match = re.match(r"^require_brief:\s*(.+)$", stripped)
            if match:
                config["elicitation"]["require_brief"] = bool(_parse_scalar(match.group(1)))
            match = re.match(r"^require_brief_complex:\s*(.+)$", stripped)
            if match:
                config["elicitation"]["require_brief_complex"] = bool(
                    _parse_scalar(match.group(1))
                )
            match = re.match(r"^require_nfr_complex:\s*(.+)$", stripped)
            if match:
                config["elicitation"]["require_nfr_complex"] = str(
                    _parse_scalar(match.group(1))
                ).lower()
            match = re.match(r"^require_test_plan_complex:\s*(.+)$", stripped)
            if match:
                config["elicitation"]["require_test_plan_complex"] = str(
                    _parse_scalar(match.group(1))
                ).lower()

        if section == "converge":
            match = re.match(r"^every_n_tasks:\s*(.+)$", stripped)
            if match:
                config["converge"]["every_n_tasks"] = int(_parse_scalar(match.group(1)))
            match = re.match(r"^mode:\s*(.+)$", stripped)
            if match:
                config["converge"]["mode"] = str(_parse_scalar(match.group(1))).lower()

        index += 1

    return config


def load_ship_surface_config(cwd: Path | str | None = None) -> dict:
    """Return ship_surface globs with defaults for validate_ship_surface.py."""

    return load_project_config(cwd)["ship_surface"]


def load_elicitation_config(cwd: Path | str | None = None) -> dict:
    """Return elicitation policy with defaults for validate_spec and req-analysis."""

    return load_project_config(cwd)["elicitation"]


def load_converge_config(cwd: Path | str | None = None) -> dict:
    """Return converge policy for loop-plan hints."""

    return load_project_config(cwd)["converge"]
