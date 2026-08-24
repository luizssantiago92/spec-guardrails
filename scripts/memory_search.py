#!/usr/bin/env python3
"""Full-text search over the SQLite memory index (entity_fts).

    python3 memory_search.py "authentication route"
    python3 memory_search.py "REQ-001" --limit 5 --json

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE

GATE = "memory-search"
DB_PATH = Path(".specs/memory/memory.db")
DEFAULT_LIMIT = 10
MAX_LIMIT = 50


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {DB_PATH}")
    print(f"  error   {message}")
    return code


def sanitize_fts_query(raw: str) -> str:
    """Return an FTS5-safe query string (token AND chain)."""

    tokens = re.findall(r"[A-Za-z0-9_\-]+", raw)
    if not tokens:
        raise ValueError("query must contain at least one searchable token")
    return " AND ".join(f'"{token}"' for token in tokens)


def search(query: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"{DB_PATH} not found — run `memory-index rebuild` after install"
        )

    fts_query = sanitize_fts_query(query)
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT e.id, e.kind, e.label, e.source_path, e.updated_at
            FROM entity_fts f
            JOIN entities e ON e.id = f.id
            WHERE entity_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (fts_query, limit),
        ).fetchall()
    finally:
        conn.close()

    return [
        {
            "id": row[0],
            "kind": row[1],
            "label": row[2],
            "source_path": row[3],
            "updated_at": row[4],
        }
        for row in rows
    ]


def cmd_search(args: argparse.Namespace) -> int:
    try:
        results = search(args.query, limit=args.limit)
    except FileNotFoundError as err:
        return fail(str(err))
    except ValueError as err:
        return fail(str(err), EXIT_USAGE)

    payload = {"query": args.query, "count": len(results), "results": results}

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"[{GATE}] {len(results)} match(es) for {args.query!r}")
        for item in results:
            print(f"  {item['id']} ({item['kind']}): {item['label']}")
            if item.get("source_path"):
                print(f"           {item['source_path']}")

    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Search the SQLite memory index (FTS5)")
    parser.add_argument("query", help="search terms")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--json", action="store_true")
    parser.set_defaults(func=cmd_search)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.limit < 1 or args.limit > MAX_LIMIT:
        return fail(f"--limit must be between 1 and {MAX_LIMIT}", EXIT_USAGE)

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
