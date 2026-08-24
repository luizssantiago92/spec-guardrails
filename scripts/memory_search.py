#!/usr/bin/env python3
"""Full-text search over the SQLite memory index (chunks + entity metadata).

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
from _memory_config import DB_PATH

GATE = "memory-search"
DEFAULT_LIMIT = 10
MAX_LIMIT = 50


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {DB_PATH}")
    print(f"  error   {message}")
    return code


def sanitize_fts_query(raw: str) -> str:
    tokens = re.findall(r"[A-Za-z0-9_\-]+", raw)
    if not tokens:
        raise ValueError("query must contain at least one searchable token")
    return " AND ".join(f'"{token}"' for token in tokens)


def search_chunks(query: str, limit: int) -> list[dict]:
    fts_query = sanitize_fts_query(query)
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT c.id, c.entity_id, c.kind, c.source_path, c.text, c.updated_at, f.rank
            FROM chunk_fts f
            JOIN chunks c ON c.id = f.id
            WHERE chunk_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (fts_query, limit),
        ).fetchall()
    finally:
        conn.close()

    results = []
    for row in rows:
        text = row[4]
        snippet = text if len(text) <= 240 else text[:237] + "..."
        results.append(
            {
                "chunk_id": row[0],
                "entity_id": row[1],
                "kind": row[2],
                "source_path": row[3],
                "snippet": snippet,
                "updated_at": row[5],
                "score": float(-row[6]) if row[6] is not None else 0.0,
                "source": "fts-chunk",
            }
        )
    return results


def search_entities(query: str, limit: int) -> list[dict]:
    fts_query = sanitize_fts_query(query)
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT e.id, e.kind, e.label, e.source_path, e.updated_at, f.rank
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
            "chunk_id": None,
            "entity_id": row[0],
            "kind": row[1],
            "source_path": row[3],
            "snippet": row[2],
            "updated_at": row[4],
            "score": float(-row[5]) if row[5] is not None else 0.0,
            "source": "fts-entity",
        }
        for row in rows
    ]


def search(query: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"{DB_PATH} not found — run `memory-index rebuild` after install"
        )

    chunk_hits = search_chunks(query, limit)
    if chunk_hits:
        return chunk_hits

    return search_entities(query, limit)


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
            label = item.get("snippet") or item.get("entity_id")
            kind = item.get("kind")
            print(f"  {item.get('chunk_id') or item.get('entity_id')} ({kind}): {label}")
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
