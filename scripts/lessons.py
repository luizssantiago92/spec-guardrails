#!/usr/bin/env python3
"""Lessons engine for `.specs/lessons.json` and the generated `LESSONS.md`.

A lesson is recorded only from a grounded verification failure. A clean PASS
records nothing. Candidates are not guidance; only confirmed lessons are.

    python3 lessons.py add --title "..." --rule "..." --source features/auth/validation.md
    python3 lessons.py list --status confirmed
    python3 lessons.py penalize --id L-001 --source features/auth/validation.md
    python3 lessons.py prune
    python3 lessons.py status

Exit codes: 0 ok, 1 refused / corrupt store, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE

GATE = "lessons"
STORE_PATH = Path(".specs/lessons.json")
MARKDOWN_PATH = Path(".specs/LESSONS.md")
SPECS_DIR = Path(".specs")
FEATURES_DIR = Path(".specs/features")
PRUNE_AFTER = timedelta(days=90)
PROMOTE_AFTER_FEATURES = 2
QUARANTINE_AFTER_PENALTIES = 2
SOURCE_LINE = re.compile(r":(\d{1,6})$")
FEATURE_IN_PATH = re.compile(
    r"(?:^|/)features/(?P<name>[^/]+)/", re.IGNORECASE
)

STATUSES = (
    "observed",
    "repeated",
    "candidate",
    "approved",
    "graduated",
    "deprecated",
    "quarantined",
)
LEGACY_CONFIRMED = "confirmed"
GUIDANCE_STATUSES = frozenset({"approved", "graduated", LEGACY_CONFIRMED})
PROMOTION_CHAIN = ("observed", "repeated", "candidate", "approved")


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {STORE_PATH}")
    print(f"  error   {message}")
    return code


def ok(message: str) -> int:
    print(f"[{GATE}] PASS - {message}")
    return EXIT_OK


def normalize_status(raw: str | None) -> str:
    value = str(raw or "").strip().lower()
    if value == LEGACY_CONFIRMED:
        return "approved"
    return value


def is_guidance_status(status: str) -> bool:
    return normalize_status(status) in GUIDANCE_STATUSES


def next_promotion_status(status: str) -> str | None:
    normalized = normalize_status(status)
    if normalized == LEGACY_CONFIRMED:
        return "graduated"
    try:
        index = PROMOTION_CHAIN.index(normalized)
    except ValueError:
        return None
    if index + 1 >= len(PROMOTION_CHAIN):
        return None
    return PROMOTION_CHAIN[index + 1]


def normalize(text: str) -> str:
    """Casefold, strip accents and punctuation, collapse whitespace."""

    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", stripped.casefold()).strip()


def parse_source(raw: str) -> tuple[Path, str | None]:
    """Split an optional `:line` suffix from a source path."""

    match = SOURCE_LINE.search(raw)
    if match:
        return Path(raw[: match.start()]), match.group(1)
    return Path(raw), None


def infer_feature(source: Path, explicit: str | None) -> str:
    if explicit:
        return explicit.strip()

    # Path.as_posix() does not convert backslashes that were part of the original
    # string on POSIX, so normalize both separators before matching.
    normalized = str(source).replace("\\", "/")
    match = FEATURE_IN_PATH.search(normalized)
    if match:
        return match.group("name")

    return source.parent.name or "unknown"


def _under_specs(path: Path) -> bool:
    """Return True when `path` resolves inside `.specs/` of the current project."""

    try:
        resolved = path.expanduser().resolve()
        specs = SPECS_DIR.expanduser().resolve()
        resolved.relative_to(specs)
        return True
    except (OSError, ValueError):
        return False


def validate_source(raw: str) -> tuple[Path, str] | int:
    """Return (path, original) or an exit code."""

    if not raw or not raw.strip():
        return fail("--source is required - a lesson without evidence is opinion", EXIT_USAGE)

    path, _line = parse_source(raw.strip())
    if not path.exists() or not path.is_file():
        return fail(f"source file not found: {path}")

    if path.name.lower() != "validation.md":
        return fail(
            f"source must be a validation.md (got {path.name}) - "
            "lessons are distilled from /verify, not from opinion"
        )

    if not _under_specs(path):
        return fail("source must live under .specs/")

    if not path.read_text(encoding="utf-8").strip():
        return fail(f"source is empty: {path}")

    return path, raw.strip()


def empty_store() -> dict:
    return {"version": 1, "lessons": []}


def load_store() -> dict | int:
    if not STORE_PATH.exists():
        return empty_store()

    try:
        payload = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        return fail(f"lessons.json is corrupt: {err}")

    if not isinstance(payload, dict) or not isinstance(payload.get("lessons"), list):
        return fail("lessons.json is corrupt: expected an object with a lessons array")

    for index, item in enumerate(payload["lessons"]):
        if not isinstance(item, dict):
            return fail(f"lessons.json is corrupt: lesson {index} is not an object")
        if not str(item.get("title") or "").strip() or not str(item.get("rule") or "").strip():
            identity = item.get("id") or f"index {index}"
            return fail(f"lessons.json is corrupt: {identity} is missing title or rule")

    return payload


def next_id(lessons: list[dict]) -> str:
    numbers = []
    for lesson in lessons:
        match = re.match(r"L-(\d+)$", str(lesson.get("id", "")))
        if match:
            numbers.append(int(match.group(1)))
    return f"L-{max(numbers, default=0) + 1:03d}"


def fingerprint(lesson: dict) -> str:
    return f"{normalize(lesson.get('title', ''))}\n{normalize(lesson.get('rule', ''))}"


def today_iso() -> str:
    return date.today().isoformat()


def parse_iso_date(raw: str) -> date | None:
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def render_markdown(store: dict) -> str:
    guidance = [
        item
        for item in store["lessons"]
        if is_guidance_status(str(item.get("status") or ""))
        and normalize_status(str(item.get("status") or "")) != "graduated"
    ]
    graduated = [
        item
        for item in store["lessons"]
        if normalize_status(str(item.get("status") or "")) == "graduated"
    ]
    lines = [
        "# Lessons Learned",
        "",
        "Generated by `lessons.py` from `.specs/lessons.json`. Do not edit this file.",
        "A clean PASS records nothing. Only **approved** lessons below are guidance.",
        "Graduated rules live in engineering standards — never auto-graduate.",
        "Inspect candidates with `python3 .specs/guardrails/scripts/lessons.py list --status all`.",
        "",
    ]

    if not guidance:
        lines.append("- none yet")
    else:
        for lesson in guidance:
            lines.append(f"### {lesson.get('id', '?')}: {lesson.get('title', '')}")
            if lesson.get("trigger"):
                lines.append(f"- **Trigger**: {lesson['trigger']}")
            lines.append(f"- **Rule**: {lesson.get('rule', '')}")
            features = ", ".join(lesson.get("features") or [])
            if features:
                lines.append(f"- **Features**: {features}")
            lines.append(f"- **Source**: {lesson.get('source', '—')}")
            lines.append("")

    if graduated:
        lines.extend(["## Graduated", ""])
        for lesson in graduated:
            lines.append(f"- {lesson.get('id', '?')}: {lesson.get('title', '')}")

    lines.append("")
    return "\n".join(lines)


def atomic_write(path: Path, text: str) -> None:
    """Write `text` via a same-directory tempfile so a crash cannot truncate the store."""

    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        Path(tmp_name).replace(path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def save_store(store: dict) -> None:
    SPECS_DIR.mkdir(parents=True, exist_ok=True)
    atomic_write(
        STORE_PATH, json.dumps(store, indent=2, ensure_ascii=False) + "\n"
    )
    atomic_write(MARKDOWN_PATH, render_markdown(store))


def find_duplicate(store: dict, title: str, rule: str) -> dict | None:
    needle = f"{normalize(title)}\n{normalize(rule)}"
    for lesson in store["lessons"]:
        if fingerprint(lesson) == needle:
            return lesson
    return None


def cmd_add(args: argparse.Namespace) -> int:
    source = validate_source(args.source)
    if isinstance(source, int):
        return source
    source_path, source_raw = source

    title = (args.title or "").strip()
    rule = (args.rule or "").strip()
    if not title or not rule:
        return fail("--title and --rule are required", EXIT_USAGE)

    store = load_store()
    if isinstance(store, int):
        return store

    feature = infer_feature(source_path, args.feature)
    existing = find_duplicate(store, title, rule)
    now = today_iso()

    if existing:
        features = list(existing.get("features") or [])
        if feature in features:
            existing["updated"] = now
            save_store(store)
            return ok(
                f"{existing['id']} already recorded for '{feature}' - "
                "same-feature recurrence does not promote"
            )

        features.append(feature)
        existing["features"] = features
        existing["updated"] = now
        existing["source"] = source_raw
        if (
            normalize_status(str(existing.get("status"))) == "candidate"
            and len(features) >= PROMOTE_AFTER_FEATURES
        ):
            existing["status"] = "approved"
            save_store(store)
            return ok(
                f"{existing['id']} promoted to approved "
                f"(seen in {len(features)} features)"
            )

        save_store(store)
        return ok(f"{existing['id']} recorded for '{feature}'")

    lesson = {
        "id": next_id(store["lessons"]),
        "title": title,
        "trigger": (args.trigger or "").strip(),
        "rule": rule,
        "status": "candidate",
        "source": source_raw,
        "features": [feature],
        "created": now,
        "updated": now,
        "penalties": 0,
    }
    store["lessons"].append(lesson)
    save_store(store)
    return ok(f"{lesson['id']} stored as candidate from '{feature}'")


def cmd_list(args: argparse.Namespace) -> int:
    store = load_store()
    if isinstance(store, int):
        return store

    wanted = args.status or "approved"
    if wanted == "all":
        rows = store["lessons"]
    elif wanted == LEGACY_CONFIRMED:
        rows = [
            item
            for item in store["lessons"]
            if is_guidance_status(str(item.get("status") or ""))
        ]
    elif wanted in STATUSES:
        rows = [
            item for item in store["lessons"] if normalize_status(item.get("status")) == wanted
        ]
    else:
        return fail(
            f"unknown status '{wanted}' - use {', '.join(STATUSES)}, confirmed, or all",
            EXIT_USAGE,
        )

    print(f"[{GATE}] {len(rows)} {wanted} lesson(s)")
    for lesson in rows:
        trigger = f" — {lesson['trigger']}" if lesson.get("trigger") else ""
        print(f"  {lesson.get('id', '?')}  {lesson.get('status', '?'):<12} {lesson.get('title', '')}{trigger}")
        print(f"           {lesson.get('rule', '')}")
    return EXIT_OK


def cmd_penalize(args: argparse.Namespace) -> int:
    source = validate_source(args.source)
    if isinstance(source, int):
        return source

    store = load_store()
    if isinstance(store, int):
        return store

    lesson_id = (args.id or "").strip().upper()
    lesson = next((item for item in store["lessons"] if item.get("id") == lesson_id), None)
    if not lesson:
        return fail(f"no such lesson: {lesson_id}")

    if normalize_status(str(lesson.get("status"))) not in {"approved", LEGACY_CONFIRMED}:
        return fail(
            f"{lesson_id} is {lesson.get('status')} - only approved lessons can be penalized"
        )

    try:
        lesson["penalties"] = int(lesson.get("penalties") or 0) + 1
    except (TypeError, ValueError):
        return fail(f"{lesson_id} has a corrupt penalties field")
    lesson["updated"] = today_iso()
    lesson["source"] = source[1]

    if lesson["penalties"] >= QUARANTINE_AFTER_PENALTIES:
        lesson["status"] = "quarantined"
        save_store(store)
        return ok(
            f"{lesson_id} quarantined after {lesson['penalties']} penalties - "
            "stop loading it as guidance"
        )

    save_store(store)
    return ok(f"{lesson_id} penalized ({lesson['penalties']}/{QUARANTINE_AFTER_PENALTIES})")


def cmd_prune(args: argparse.Namespace) -> int:
    store = load_store()
    if isinstance(store, int):
        return store

    cutoff = date.today() - PRUNE_AFTER
    kept: list[dict] = []
    removed: list[str] = []

    for lesson in store["lessons"]:
        updated = parse_iso_date(str(lesson.get("updated") or ""))
        stale_candidate = lesson.get("status") == "candidate" and (
            updated is None or updated <= cutoff
        )
        if stale_candidate:
            removed.append(lesson.get("id", "?"))
        else:
            kept.append(lesson)

    store["lessons"] = kept
    save_store(store)
    if removed:
        return ok(f"pruned {len(removed)} stale candidate(s): {', '.join(removed)}")
    return ok("no stale candidates to prune")


def cmd_status(args: argparse.Namespace) -> int:
    store = load_store()
    if isinstance(store, int):
        return store

    counts = {status: 0 for status in STATUSES}
    legacy_confirmed = 0
    for lesson in store["lessons"]:
        raw_status = str(lesson.get("status") or "")
        if raw_status == LEGACY_CONFIRMED:
            legacy_confirmed += 1
            continue
        status = normalize_status(raw_status)
        if status in counts:
            counts[status] += 1

    total = len(store["lessons"])
    print(f"[{GATE}] {total} lesson(s) in {STORE_PATH}")
    for status in STATUSES:
        print(f"  {status:<12} {counts[status]}")
    if legacy_confirmed:
        print(f"  {'confirmed (legacy)':<12} {legacy_confirmed}")
    return EXIT_OK


def cmd_promote(args: argparse.Namespace) -> int:
    store = load_store()
    if isinstance(store, int):
        return store

    lesson_id = (args.id or "").strip().upper()
    lesson = next((item for item in store["lessons"] if item.get("id") == lesson_id), None)
    if not lesson:
        return fail(f"no such lesson: {lesson_id}")

    next_status = next_promotion_status(str(lesson.get("status") or ""))
    if not next_status:
        return fail(
            f"{lesson_id} is {lesson.get('status')} - no manual promotion step available"
        )

    lesson["status"] = next_status
    lesson["updated"] = today_iso()
    save_store(store)
    return ok(f"{lesson_id} promoted to {next_status}")


def cmd_graduate(args: argparse.Namespace) -> int:
    source = validate_source(args.source)
    if isinstance(source, int):
        return source

    store = load_store()
    if isinstance(store, int):
        return store

    lesson_id = (args.id or "").strip().upper()
    lesson = next((item for item in store["lessons"] if item.get("id") == lesson_id), None)
    if not lesson:
        return fail(f"no such lesson: {lesson_id}")

    status = normalize_status(str(lesson.get("status")))
    if status not in {"approved", LEGACY_CONFIRMED}:
        return fail(
            f"{lesson_id} is {lesson.get('status')} - only approved lessons can graduate"
        )

    evidence = (args.evidence or "").strip()
    if not evidence:
        return fail("--evidence is required - graduation must cite why this is a house rule")

    lesson["status"] = "graduated"
    lesson["graduated_from"] = str(lesson.get("source") or "")
    lesson["graduation_evidence"] = evidence
    lesson["source"] = source[1]
    lesson["updated"] = today_iso()
    save_store(store)
    return ok(f"{lesson_id} graduated — stop loading as active guidance")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage grounded lessons")
    sub = parser.add_subparsers(dest="command")

    add = sub.add_parser("add", help="record a grounded lesson as a candidate")
    add.add_argument("--title", required=True)
    add.add_argument("--rule", required=True)
    add.add_argument("--source", required=True, help="path to validation.md, optionally :line")
    add.add_argument("--trigger", default="")
    add.add_argument("--feature", default="")
    add.set_defaults(func=cmd_add)

    listing = sub.add_parser("list", help="list lessons (default: approved)")
    listing.add_argument("--status", default="approved")
    listing.set_defaults(func=cmd_list)

    promote = sub.add_parser("promote", help="advance one step in the graduation lifecycle")
    promote.add_argument("--id", required=True)
    promote.set_defaults(func=cmd_promote)

    graduate = sub.add_parser("graduate", help="graduate an approved lesson into a house rule")
    graduate.add_argument("--id", required=True)
    graduate.add_argument("--source", required=True, help="path to validation.md evidence")
    graduate.add_argument("--evidence", required=True, help="why this rule is stable enough to graduate")
    graduate.set_defaults(func=cmd_graduate)

    penalize = sub.add_parser("penalize", help="mark a confirmed lesson that failed to prevent a repeat")
    penalize.add_argument("--id", required=True)
    penalize.add_argument("--source", required=True)
    penalize.set_defaults(func=cmd_penalize)

    prune = sub.add_parser("prune", help="drop candidates idle for 90 days")
    prune.set_defaults(func=cmd_prune)

    status = sub.add_parser("status", help="counts by status")
    status.set_defaults(func=cmd_status)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return EXIT_USAGE
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
