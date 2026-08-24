#!/usr/bin/env python3
"""Rebuild the SQLite memory index from `.specs/` markdown artifacts.

Source of truth remains markdown under `.specs/`. The database is a derived index.

    python3 memory_index.py rebuild
    python3 memory_index.py rebuild --json

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE, requirement_ids

GATE = "memory-index"
SPECS_DIR = Path(".specs")
FEATURES_DIR = SPECS_DIR / "features"
MEMORY_DIR = SPECS_DIR / "memory"
DB_PATH = MEMORY_DIR / "memory.db"

TASK_HEADING = re.compile(
    r"^#{2,6}\s*(?P<id>T\d{1,6})\s*[:\-–]?\s*(?P<title>.*)$",
    re.MULTILINE | re.IGNORECASE,
)
TASK_FIELD = re.compile(
    r"^\s*[-*]?\s*\*{0,2}(?P<key>[A-Za-z][A-Za-z ]+?)\*{0,2}\s*:\s*(?P<value>.+?)\s*$",
    re.MULTILINE,
)
REQ_REF = re.compile(r"\b[A-Z][A-Z0-9]{1,9}-\d{2,4}\b")


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {DB_PATH}")
    print(f"  error   {message}")
    return code


def ok(message: str) -> int:
    print(f"[{GATE}] PASS - {message}")
    return EXIT_OK


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            label TEXT NOT NULL,
            source_path TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS relations (
            from_id TEXT NOT NULL,
            to_id TEXT NOT NULL,
            kind TEXT NOT NULL,
            PRIMARY KEY (from_id, to_id, kind)
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS entity_fts USING fts5(
            id UNINDEXED,
            kind,
            label,
            source_path,
            tokenize='porter'
        );
        """
    )


def upsert_entity(
    conn: sqlite3.Connection,
    entity_id: str,
    kind: str,
    label: str,
    source_path: str | None,
    now: str,
) -> None:
    conn.execute(
        """
        INSERT INTO entities (id, kind, label, source_path, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            kind=excluded.kind,
            label=excluded.label,
            source_path=excluded.source_path,
            updated_at=excluded.updated_at
        """,
        (entity_id, kind, label, source_path, now),
    )
    conn.execute("DELETE FROM entity_fts WHERE id = ?", (entity_id,))
    conn.execute(
        "INSERT INTO entity_fts (id, kind, label, source_path) VALUES (?, ?, ?, ?)",
        (entity_id, kind, label, source_path or ""),
    )


def upsert_relation(conn: sqlite3.Connection, from_id: str, to_id: str, kind: str) -> None:
    conn.execute(
        """
        INSERT OR IGNORE INTO relations (from_id, to_id, kind)
        VALUES (?, ?, ?)
        """,
        (from_id, to_id, kind),
    )


def task_requirement_ids(tasks_text: str) -> dict[str, set[str]]:
    current_task: str | None = None
    mapping: dict[str, set[str]] = {}

    for line in tasks_text.splitlines():
        heading = TASK_HEADING.match(line)
        if heading:
            current_task = heading.group("id").upper()
            mapping.setdefault(current_task, set())
            continue

        if not current_task:
            continue

        field = TASK_FIELD.match(line)
        if not field or field.group("key").strip().lower() != "requirement":
            continue

        mapping[current_task].update(REQ_REF.findall(field.group("value")))

    return mapping


def task_file_paths(tasks_text: str) -> dict[str, set[str]]:
    current_task: str | None = None
    mapping: dict[str, set[str]] = {}

    for line in tasks_text.splitlines():
        heading = TASK_HEADING.match(line)
        if heading:
            current_task = heading.group("id").upper()
            mapping.setdefault(current_task, set())
            continue

        if not current_task:
            continue

        field = TASK_FIELD.match(line)
        if not field or field.group("key").strip().lower() != "files":
            continue

        raw = field.group("value").strip()
        if raw.lower() in {"—", "-", "none", "n/a"}:
            continue

        for part in re.split(r"[,;]", raw):
            cleaned = part.strip().strip("`")
            if cleaned:
                mapping[current_task].add(cleaned)

    return mapping


def index_lessons(conn: sqlite3.Connection, now: str) -> int:
    lessons_path = SPECS_DIR / "lessons.json"
    if not lessons_path.is_file():
        return 0

    payload = json.loads(lessons_path.read_text(encoding="utf-8"))
    count = 0
    for lesson in payload.get("lessons") or []:
        lesson_id = str(lesson.get("id") or "").strip()
        if not lesson_id:
            continue
        upsert_entity(
            conn,
            lesson_id,
            "lesson",
            str(lesson.get("title") or lesson_id),
            str(lesson.get("source") or ""),
            now,
        )
        count += 1
    return count


def rebuild(json_output: bool = False) -> int:
    if not SPECS_DIR.is_dir():
        return fail(".specs/ not found — run install first")

    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    now = utc_now()

    conn = sqlite3.connect(DB_PATH)
    try:
        init_schema(conn)
        conn.execute("DELETE FROM relations")
        conn.execute("DELETE FROM entities")
        conn.execute("DELETE FROM entity_fts")

        entity_count = 0
        relation_count = 0

        if FEATURES_DIR.is_dir():
            for feature_dir in sorted(FEATURES_DIR.iterdir()):
                if not feature_dir.is_dir():
                    continue

                feature_id = feature_dir.name
                upsert_entity(
                    conn,
                    feature_id,
                    "feature",
                    feature_id,
                    str(feature_dir / "spec.md"),
                    now,
                )
                entity_count += 1

                spec_path = feature_dir / "spec.md"
                if spec_path.is_file():
                    spec_text = spec_path.read_text(encoding="utf-8")
                    for req_id in requirement_ids(spec_text):
                        upsert_entity(
                            conn,
                            req_id,
                            "requirement",
                            req_id,
                            str(spec_path),
                            now,
                        )
                        entity_count += 1
                        upsert_relation(conn, feature_id, req_id, "contains")
                        relation_count += 1

                tasks_path = feature_dir / "tasks.md"
                if tasks_path.is_file():
                    tasks_text = tasks_path.read_text(encoding="utf-8")
                    for match in TASK_HEADING.finditer(tasks_text):
                        task_id = match.group("id").upper()
                        title = match.group("title").strip() or task_id
                        upsert_entity(
                            conn,
                            task_id,
                            "task",
                            title,
                            str(tasks_path),
                            now,
                        )
                        entity_count += 1
                        upsert_relation(conn, feature_id, task_id, "contains")
                        relation_count += 1

                    for task_id, req_ids in task_requirement_ids(tasks_text).items():
                        for req_id in req_ids:
                            upsert_relation(conn, task_id, req_id, "implements")
                            relation_count += 1

                    for task_id, files in task_file_paths(tasks_text).items():
                        for file_path in files:
                            file_entity = f"file:{file_path}"
                            upsert_entity(
                                conn,
                                file_entity,
                                "file",
                                file_path,
                                str(tasks_path),
                                now,
                            )
                            entity_count += 1
                            upsert_relation(conn, task_id, file_entity, "touches")
                            relation_count += 1

        entity_count += index_lessons(conn, now)
        conn.commit()

        summary = {
            "database": str(DB_PATH),
            "entities": entity_count,
            "relations": relation_count,
            "updated_at": now,
        }

        if json_output:
            print(json.dumps(summary, indent=2))
        else:
            return ok(
                f"indexed {entity_count} entities and {relation_count} relations -> {DB_PATH}"
            )
        return EXIT_OK
    finally:
        conn.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Rebuild SQLite memory index from .specs/")
    sub = parser.add_subparsers(dest="command")

    rebuild_cmd = sub.add_parser("rebuild", help="rebuild index from markdown artifacts")
    rebuild_cmd.add_argument("--json", action="store_true")
    rebuild_cmd.set_defaults(func=lambda args: rebuild(json_output=args.json))

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
