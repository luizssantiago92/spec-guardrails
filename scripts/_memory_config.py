"""Shared memory retrieval config parsed from `.specs/config.yaml`."""

from __future__ import annotations

import re
from pathlib import Path

SPECS_DIR = Path(".specs")
FEATURES_DIR = SPECS_DIR / "features"
CONFIG_PATH = SPECS_DIR / "config.yaml"
MEMORY_DIR = SPECS_DIR / "memory"
DB_PATH = MEMORY_DIR / "memory.db"

DEFAULT_RETRIEVAL = {
    "semantic": False,
    "provider": "none",
    "model": "text-embedding-3-small",
    "max_chunks": 20,
    "fts_weight": 0.6,
    "semantic_weight": 0.4,
    "graph_depth": 1,
}

DEFAULT_LIFECYCLE = {
    "retention_days": 90,
    "auto_archive_on_handoff": False,
}

BOOL = {"true", "false", "yes", "no", "on", "off"}


def _parse_scalar(raw: str):
    value = raw.strip().strip("'\"")
    lower = value.lower()
    if lower in {"true", "yes", "on"}:
        return True
    if lower in {"false", "no", "off"}:
        return False
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    if re.fullmatch(r"-?\d+\.\d+", value):
        return float(value)
    return value


def load_memory_retrieval_config() -> dict:
    """Return memory.retrieval settings with defaults."""

    config = dict(DEFAULT_RETRIEVAL)
    if not CONFIG_PATH.is_file():
        return config

    lines = CONFIG_PATH.read_text(encoding="utf-8").splitlines()
    in_memory = False
    in_retrieval = False
    memory_indent = 0
    retrieval_indent = 0

    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())
        stripped = line.strip()

        if stripped == "memory:":
            in_memory = True
            in_retrieval = False
            memory_indent = indent
            continue

        if not in_memory:
            continue

        if indent <= memory_indent and stripped != "memory:":
            in_memory = False
            in_retrieval = False
            continue

        if stripped == "retrieval:":
            in_retrieval = True
            retrieval_indent = indent
            continue

        if in_retrieval and indent <= retrieval_indent and not stripped.startswith("retrieval:"):
            in_retrieval = False

        if not in_retrieval:
            continue

        match = re.match(r"^([a-z_]+):\s*(.*)$", stripped)
        if not match:
            continue

        key, raw_value = match.group(1), match.group(2)
        if key not in config:
            continue
        if raw_value == "":
            continue
        config[key] = _parse_scalar(raw_value)

    return config


def load_memory_lifecycle_config() -> dict:
    """Return memory.lifecycle settings with defaults."""

    config = dict(DEFAULT_LIFECYCLE)
    if not CONFIG_PATH.is_file():
        return config

    lines = CONFIG_PATH.read_text(encoding="utf-8").splitlines()
    in_memory = False
    in_lifecycle = False
    memory_indent = 0
    lifecycle_indent = 0

    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())
        stripped = line.strip()

        if stripped == "memory:":
            in_memory = True
            in_lifecycle = False
            memory_indent = indent
            continue

        if not in_memory:
            continue

        if indent <= memory_indent and stripped != "memory:":
            in_memory = False
            in_lifecycle = False
            continue

        if stripped == "lifecycle:":
            in_lifecycle = True
            lifecycle_indent = indent
            continue

        if in_lifecycle and indent <= lifecycle_indent and not stripped.startswith("lifecycle:"):
            in_lifecycle = False

        if not in_lifecycle:
            continue

        match = re.match(r"^([a-z_]+):\s*(.*)$", stripped)
        if not match:
            continue

        key, raw_value = match.group(1), match.group(2)
        if key not in config or raw_value == "":
            continue
        config[key] = _parse_scalar(raw_value)

    return config
