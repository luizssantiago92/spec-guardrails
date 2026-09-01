#!/usr/bin/env python3
"""Conventional Commits gate for guardrails commits.

Run before each atomic commit:

    python3 check_commit.py --message "feat(auth): add token refresh"
    python3 check_commit.py --file .git/COMMIT_EDITMSG

Wire it as a git hook to enforce the format without agent involvement:

    #!/bin/sh
    python3 .specs/guardrails/scripts/check_commit.py --file "$1"

Checks:
  * `type(scope): subject` shape with an allowed type
  * subject is present, lowercase-initial, without a trailing period
  * subject length within 72 characters
  * body separated from subject by a blank line

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from _common import EXIT_OK, EXIT_USAGE, Report
from _project_config import DEFAULT_MAX_STAGED_LINES, load_project_config

GATE = "check-commit"

ALLOWED_TYPES = (
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "revert",
)

HEADER = re.compile(
    r"^(?P<type>[a-z]+)(?:\((?P<scope>[^()]+)\))?(?P<breaking>!)?:\s(?P<subject>.+)$"
)
MAX_SUBJECT_LENGTH = 72


def read_staged_diff(cwd: Path) -> str:
    result = subprocess.run(
        ["git", "diff", "--cached", "--numstat"],
        cwd=cwd,
        capture_output=True,
        text=True,
        # Paths can carry bytes the platform locale cannot decode.
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError((result.stderr or "").strip() or "git diff --cached --numstat failed")
    return result.stdout or ""


def count_staged_lines(numstat_text: str) -> int:
    total = 0
    for line in numstat_text.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        added, deleted = parts[0], parts[1]
        if added == "-" or deleted == "-":
            continue
        total += int(added) + int(deleted)
    return total


def build_staged_report(cwd: Path) -> Report:
    report = Report(gate=GATE, target="staged changes")
    config = load_project_config(cwd)
    max_lines = int(config.get("commit", {}).get("max_staged_lines") or DEFAULT_MAX_STAGED_LINES)

    if not (cwd / ".git").exists():
        report.error("not a git repository")
        return report

    try:
        numstat = read_staged_diff(cwd)
    except RuntimeError as err:
        report.error(str(err))
        return report

    if not numstat.strip():
        report.error("empty commit blocked — no staged changes")
        return report

    lines = count_staged_lines(numstat)
    report.ok(f"staged diff spans {lines} line(s)")
    if lines > max_lines:
        report.error(
            f"staged diff is {lines} lines — limit is {max_lines} "
            "(split the commit or raise commit.max_staged_lines in config)"
        )
    return report


def build_report(message: str) -> Report:
    lines = message.rstrip().splitlines()
    header = lines[0].strip() if lines else ""
    report = Report(gate=GATE, target=header or "(empty message)")

    if not header:
        report.error("commit message is empty")
        return report

    if header.startswith(("Merge ", "Revert ", "fixup!", "squash!")):
        report.ok("merge/fixup commit - format check skipped")
        return report

    match = HEADER.match(header)
    if not match:
        report.error(
            "header does not follow Conventional Commits "
            "- expected 'type(scope): subject'"
        )
        return report

    commit_type = match.group("type")
    subject = match.group("subject").strip()

    if commit_type in ALLOWED_TYPES:
        report.ok(f"type '{commit_type}' is allowed")
    else:
        report.error(
            f"unknown type '{commit_type}' - allowed: {', '.join(ALLOWED_TYPES)}"
        )

    scope = match.group("scope")
    if scope is not None and not scope.strip():
        report.error("scope parentheses are empty")

    if not subject:
        report.error("subject is empty")
    else:
        if subject.endswith("."):
            report.error("subject must not end with a period")
        if subject[0].isupper() and not subject.split()[0].isupper():
            report.warn("subject starts with an uppercase letter - prefer lowercase")
        if len(header) > MAX_SUBJECT_LENGTH:
            report.error(
                f"header is {len(header)} characters - keep it within {MAX_SUBJECT_LENGTH}"
            )
        else:
            report.ok(f"header length {len(header)}/{MAX_SUBJECT_LENGTH}")

    if len(lines) > 1 and lines[1].strip():
        report.error("body must be separated from the subject by a blank line")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a commit message and/or staged diff")
    parser.add_argument("--message", help="commit message text")
    parser.add_argument("--file", help="path to a file holding the commit message")
    parser.add_argument(
        "--staged",
        action="store_true",
        help="validate staged diff size and reject empty commits",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as blocking failures",
    )
    parser.add_argument(
        "--cwd",
        default=".",
        help="repository root for --staged (default: current directory)",
    )
    args = parser.parse_args(argv)

    if args.message and args.file:
        print(f"[{GATE}] FAIL - arguments")
        print("  error   use either --message or --file, not both")
        return EXIT_USAGE

    if not args.staged and not args.message and not args.file:
        print(f"[{GATE}] FAIL - arguments")
        print("  error   provide --message, --file, or --staged")
        return EXIT_USAGE

    exit_code = EXIT_OK

    if args.staged:
        staged_report = build_staged_report(Path(args.cwd).resolve())
        exit_code = max(exit_code, staged_report.emit(strict=args.strict))

    if args.message or args.file:
        if args.file:
            path = Path(args.file).expanduser()
            if not path.exists():
                print(f"[{GATE}] FAIL - {path}")
                print(f"  error   file not found: {path}")
                return EXIT_USAGE
            message = path.read_text(encoding="utf-8")
        else:
            message = args.message or ""

        comment_free = "\n".join(
            line for line in message.splitlines() if not line.startswith("#")
        )
        message_report = build_report(comment_free)
        exit_code = max(exit_code, message_report.emit(strict=args.strict))

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
