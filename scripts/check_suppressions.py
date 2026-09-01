#!/usr/bin/env python3
"""Block verification suppressions in staged diffs.

Run before commit when agents might silence linters or skip hooks:

    python3 check_suppressions.py
    python3 check_suppressions.py --cwd /path/to/repo

Scans `git diff --cached` for patterns such as `# noqa`, `eslint-disable`,
`@ts-ignore`, skipped tests, or `--no-verify`. Patterns are configurable under
`.specs/config.yaml` → `suppressions.patterns`.

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from _common import EXIT_USAGE, Report
from _project_config import DEFAULT_SUPPRESSION_PATTERNS, load_project_config

GATE = "check-suppressions"


def read_staged_diff(cwd: Path) -> str:
    result = subprocess.run(
        ["git", "diff", "--cached", "--unified=0", "--no-color"],
        cwd=cwd,
        capture_output=True,
        text=True,
        # Diffs can carry bytes the platform locale cannot decode (SVG, em dashes).
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError((result.stderr or "").strip() or "git diff --cached failed")
    return result.stdout or ""


def added_lines(diff_text: str) -> list[tuple[str, str]]:
    """Return (file, line) pairs for added lines in a unified diff."""

    entries: list[tuple[str, str]] = []
    current_file = "(unknown)"
    for line in diff_text.splitlines():
        if line.startswith("+++ b/"):
            current_file = line[6:].strip()
            continue
        if line.startswith("+") and not line.startswith("+++"):
            entries.append((current_file, line[1:]))
    return entries


def build_report(diff_text: str, patterns: list[str]) -> Report:
    report = Report(gate=GATE, target="staged diff")
    compiled = [(pattern, re.compile(pattern, re.IGNORECASE)) for pattern in patterns]

    if not diff_text.strip():
        report.ok("no staged changes — suppression scan skipped")
        return report

    additions = added_lines(diff_text)
    hits = 0
    for file_path, content in additions:
        for pattern, regex in compiled:
            if regex.search(content):
                hits += 1
                report.error(f"{file_path}: added line matches forbidden pattern /{pattern}/")

    if hits == 0:
        report.ok(f"no forbidden suppressions in {len(additions)} added line(s)")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Block linter/test suppressions in staged diff")
    parser.add_argument(
        "--cwd",
        default=".",
        help="repository root (default: current directory)",
    )
    args = parser.parse_args(argv)

    cwd = Path(args.cwd).resolve()
    if not (cwd / ".git").exists():
        print(f"[{GATE}] FAIL - {cwd}")
        print("  error   not a git repository")
        return EXIT_USAGE

    config = load_project_config(cwd)
    patterns = config.get("suppressions", {}).get("patterns") or DEFAULT_SUPPRESSION_PATTERNS

    try:
        diff_text = read_staged_diff(cwd)
    except RuntimeError as err:
        print(f"[{GATE}] FAIL - staged diff")
        print(f"  error   {err}")
        return EXIT_USAGE

    report = build_report(diff_text, patterns)
    return report.emit()


if __name__ == "__main__":
    sys.exit(main())
