#!/usr/bin/env python3
"""Hybrid memory retrieval: FTS chunks + graph expansion (+ optional semantic).

    python3 memory_retrieve.py "silent session expiry"
    python3 memory_retrieve.py "auth failure" --mode hybrid --json

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import deque

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE
from _memory_config import DB_PATH, load_memory_retrieval_config
from _memory_embed import cosine_similarity, get_embed_fn, unpack_vector
from memory_search import search, search_chunks

GATE = "memory-retrieve"


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {DB_PATH}")
    print(f"  error   {message}")
    return code


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

    return [
        {
            "relation": row[0],
            "entity": {
                "id": row[1],
                "kind": row[2],
                "label": row[3],
                "source_path": row[4],
            },
        }
        for row in rows
    ]


def expand_graph(entity_ids: list[str], depth: int) -> dict:
    if not DB_PATH.is_file() or depth <= 0 or not entity_ids:
        return {"entities": [], "relations": []}

    conn = sqlite3.connect(DB_PATH)
    visited: set[str] = set()
    entities: dict[str, dict] = {}
    relations: list[dict] = []
    queue: deque[tuple[str, int]] = deque()

    try:
        for entity_id in entity_ids:
            if entity_id and entity_id not in visited:
                visited.add(entity_id)
                queue.append((entity_id, 0))

        while queue:
            current_id, current_depth = queue.popleft()
            if current_depth >= depth:
                continue

            row = conn.execute(
                "SELECT id, kind, label, source_path, updated_at FROM entities WHERE id = ?",
                (current_id,),
            ).fetchone()
            if row:
                entities[current_id] = {
                    "id": row[0],
                    "kind": row[1],
                    "label": row[2],
                    "source_path": row[3],
                    "updated_at": row[4],
                }

            for neighbor in fetch_neighbors(conn, current_id):
                target = neighbor["entity"]
                target_id = target["id"]
                relations.append(
                    {"from": current_id, "to": target_id, "kind": neighbor["relation"]}
                )
                if target_id not in entities:
                    entities[target_id] = target
                if target_id not in visited:
                    visited.add(target_id)
                    queue.append((target_id, current_depth + 1))
    finally:
        conn.close()

    return {"entities": list(entities.values()), "relations": relations}


def semantic_search(query: str, limit: int, provider: str, model: str) -> list[dict]:
    embed_fn = get_embed_fn(provider, model)
    query_vector = embed_fn(query)

    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT c.id, c.entity_id, c.kind, c.source_path, c.text, e.vector
            FROM embeddings e
            JOIN chunks c ON c.id = e.chunk_id
            WHERE e.provider = ? AND e.model = ?
            """,
            (provider, model),
        ).fetchall()
    finally:
        conn.close()

    scored: list[tuple[float, dict]] = []
    for chunk_id, entity_id, kind, source_path, text, blob in rows:
        vector = unpack_vector(blob)
        score = cosine_similarity(query_vector, vector)
        if score <= 0:
            continue
        snippet = text if len(text) <= 240 else text[:237] + "..."
        scored.append(
            (
                score,
                {
                    "chunk_id": chunk_id,
                    "entity_id": entity_id,
                    "kind": kind,
                    "source_path": source_path,
                    "snippet": snippet,
                    "score": round(score, 4),
                    "source": "semantic",
                },
            )
        )

    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:limit]]


def merge_hybrid(
    fts_results: list[dict],
    semantic_results: list[dict],
    fts_weight: float,
    semantic_weight: float,
    max_chunks: int,
) -> list[dict]:
    merged: dict[str, dict] = {}

    for rank, item in enumerate(fts_results):
        key = item.get("chunk_id") or item.get("entity_id") or f"fts-{rank}"
        score = fts_weight * (1.0 / (rank + 1))
        merged[key] = {**item, "score": round(score, 4), "sources": [item.get("source", "fts")]}

    for rank, item in enumerate(semantic_results):
        key = item.get("chunk_id") or item.get("entity_id") or f"sem-{rank}"
        bonus = semantic_weight * (item.get("score") or (1.0 / (rank + 1)))
        if key in merged:
            merged[key]["score"] = round(merged[key]["score"] + bonus, 4)
            merged[key]["sources"].append("semantic")
        else:
            merged[key] = {**item, "score": round(bonus, 4), "sources": ["semantic"]}

    ordered = sorted(merged.values(), key=lambda item: item.get("score", 0), reverse=True)
    return ordered[:max_chunks]


def retrieve(query: str, mode: str) -> dict:
    if not DB_PATH.is_file():
        raise FileNotFoundError(
            f"{DB_PATH} not found — run `memory-index rebuild` after install"
        )

    config = load_memory_retrieval_config()
    max_chunks = int(config.get("max_chunks") or 20)
    graph_depth = int(config.get("graph_depth") or 1)
    fts_weight = float(config.get("fts_weight") or 0.6)
    semantic_weight = float(config.get("semantic_weight") or 0.4)
    semantic_enabled = bool(config.get("semantic"))
    provider = str(config.get("provider") or "none")
    model = str(config.get("model") or "text-embedding-3-small")

    fts_results = search_chunks(query, max_chunks)
    if not fts_results:
        fts_results = search(query, max_chunks)

    semantic_results: list[dict] = []
    if mode in {"hybrid", "semantic"} and semantic_enabled and provider not in {"", "none"}:
        try:
            semantic_results = semantic_search(query, max_chunks, provider, model)
        except RuntimeError:
            if mode == "semantic":
                raise
            semantic_results = []

    if mode == "semantic" and semantic_results:
        results = semantic_results[:max_chunks]
    elif mode == "hybrid" and semantic_results:
        results = merge_hybrid(
            fts_results, semantic_results, fts_weight, semantic_weight, max_chunks
        )
    else:
        results = fts_results[:max_chunks]

    seed_ids = []
    for item in results:
        if item.get("entity_id"):
            seed_ids.append(item["entity_id"])
    graph = expand_graph(seed_ids, graph_depth if mode != "fts" else 0)

    return {
        "query": query,
        "mode": mode,
        "semantic_enabled": semantic_enabled,
        "results": results,
        "graph_expansion": {
            "entities": len(graph["entities"]),
            "relations": len(graph["relations"]),
            "entities_detail": graph["entities"],
            "relations_detail": graph["relations"],
        },
    }


def cmd_retrieve(args: argparse.Namespace) -> int:
    try:
        package = retrieve(args.query, args.mode)
    except FileNotFoundError as err:
        return fail(str(err))
    except RuntimeError as err:
        return fail(str(err))

    if args.json:
        print(json.dumps(package, indent=2))
    else:
        print(
            f"[{GATE}] {len(package['results'])} result(s) for {args.query!r} "
            f"(mode={package['mode']})"
        )
        for item in package["results"]:
            sources = ",".join(item.get("sources") or [item.get("source", "fts")])
            label = item.get("snippet") or item.get("entity_id")
            print(f"  {item.get('chunk_id') or item.get('entity_id')} [{sources}]: {label}")
        graph = package["graph_expansion"]
        print(
            f"  graph: {graph['entities']} entities, {graph['relations']} relations"
        )

    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Hybrid retrieval over the memory index")
    parser.add_argument("query", help="natural language or keyword query")
    parser.add_argument(
        "--mode",
        choices=["fts", "hybrid", "semantic"],
        default="hybrid",
        help="retrieval strategy (default: hybrid)",
    )
    parser.add_argument("--json", action="store_true")
    parser.set_defaults(func=cmd_retrieve)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
