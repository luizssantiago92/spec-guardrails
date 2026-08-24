#!/usr/bin/env python3
"""Bounded knowledge-graph traversal over the SQLite memory index.

    python3 memory_query.py --from T1 --depth 2
    python3 memory_query.py --from REQ-001 --depth 1 --json

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import deque
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE

GATE = "memory-query"
DB_PATH = Path(".specs/memory/memory.db")
DEFAULT_DEPTH = 2
MAX_DEPTH = 5


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {DB_PATH}")
    print(f"  error   {message}")
    return code


def normalize_entity_id(raw: str) -> str:
    value = raw.strip()
    if value.upper().startswith("T") and value[1:].isdigit():
        return f"T{int(value[1:])}"
    return value


def fetch_entity(conn: sqlite3.Connection, entity_id: str) -> dict | None:
    row = conn.execute(
        "SELECT id, kind, label, source_path, updated_at FROM entities WHERE id = ?",
        (entity_id,),
    ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "kind": row[1],
        "label": row[2],
        "source_path": row[3],
        "updated_at": row[4],
    }


def fetch_neighbors(conn: sqlite3.Connection, entity_id: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT r.kind, e.id, e.kind, e.label, e.source_path
        FROM relations r
        JOIN entities e ON e.id = r.to_id
        WHERE r.from_id = ?
        UNION
        SELECT r.kind, e.id, e.kind, e.label, e.source_path
        FROM relations r
        JOIN entities e ON e.id = r.from_id
        WHERE r.to_id = ?
        """,
        (entity_id, entity_id),
    ).fetchall()

    neighbors: list[dict] = []
    for kind, nid, nkind, label, source_path in rows:
        neighbors.append(
            {
                "relation": kind,
                "entity": {
                    "id": nid,
                    "kind": nkind,
                    "label": label,
                    "source_path": source_path,
                },
            }
        )
    return neighbors


def traverse(from_id: str, depth: int) -> dict:
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"{DB_PATH} not found — run `memory-index rebuild` after install"
        )

    conn = sqlite3.connect(DB_PATH)
    try:
        root_id = normalize_entity_id(from_id)
        root = fetch_entity(conn, root_id)
        if not root:
            raise LookupError(f"entity not found: {root_id}")

        visited: set[str] = {root_id}
        edges: list[dict] = []
        entities: dict[str, dict] = {root_id: root}
        queue: deque[tuple[str, int]] = deque([(root_id, 0)])

        while queue:
            current_id, current_depth = queue.popleft()
            if current_depth >= depth:
                continue

            for neighbor in fetch_neighbors(conn, current_id):
                target = neighbor["entity"]
                target_id = target["id"]
                edges.append(
                    {
                        "from": current_id,
                        "to": target_id,
                        "kind": neighbor["relation"],
                    }
                )
                if target_id not in entities:
                    entities[target_id] = target
                if target_id not in visited:
                    visited.add(target_id)
                    queue.append((target_id, current_depth + 1))

        return {
            "from": root_id,
            "depth": depth,
            "entities": list(entities.values()),
            "relations": edges,
        }
    finally:
        conn.close()


def cmd_query(args: argparse.Namespace) -> int:
    depth = args.depth if args.depth is not None else DEFAULT_DEPTH
    if depth < 0 or depth > MAX_DEPTH:
        return fail(f"--depth must be between 0 and {MAX_DEPTH}", EXIT_USAGE)

    try:
        package = traverse(args.from_id, depth)
    except FileNotFoundError as err:
        return fail(str(err))
    except LookupError as err:
        return fail(str(err))

    if args.json:
        print(json.dumps(package, indent=2))
    else:
        print(f"[{GATE}] context package from {package['from']} (depth {package['depth']})")
        print(f"  entities: {len(package['entities'])}")
        print(f"  relations: {len(package['relations'])}")
        for entity in package["entities"]:
            print(f"  - {entity['id']} ({entity['kind']}): {entity['label']}")

    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Query the SQLite knowledge graph")
    parser.add_argument("--from", dest="from_id", required=True, help="root entity id")
    parser.add_argument("--depth", type=int, default=DEFAULT_DEPTH)
    parser.add_argument("--json", action="store_true")
    parser.set_defaults(func=cmd_query)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
