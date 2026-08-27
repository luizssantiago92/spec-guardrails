#!/usr/bin/env python3
"""Rebuild the SQLite memory index from `.specs/` markdown artifacts.

Source of truth remains markdown under `.specs/`. The database is a derived index.

    python3 memory_index.py rebuild
    python3 memory_index.py rebuild --json
    python3 memory_index.py embed [--force]

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE, requirement_ids
from _memory_config import DB_PATH, FEATURES_DIR, MEMORY_DIR, SPECS_DIR, load_memory_retrieval_config
from _memory_embed import get_embed_fn, pack_vector

GATE = "memory-index"

TASK_HEADING = re.compile(
    r"^#{2,6}\s*(?P<id>T\d{1,6})\s*[:\-–]?\s*(?P<title>.*)$",
    re.MULTILINE | re.IGNORECASE,
)
TASK_FIELD = re.compile(
    r"^\s*[-*]?\s*\*{0,2}(?P<key>[A-Za-z][A-Za-z ]+?)\*{0,2}\s*:\s*(?P<value>.+?)\s*$",
    re.MULTILINE,
)
REQ_HEADING = re.compile(r"^#{2,6}\s*(?P<id>REQ-\d+)\b.*$", re.MULTILINE | re.IGNORECASE)
REQ_REF = re.compile(r"\b[A-Z][A-Z0-9]{1,9}-\d{2,4}\b")
SECTION_HEADING = re.compile(r"^##\s+(.+)$", re.MULTILINE)

LESSON_STATUSES = {"approved", "graduated", "confirmed"}

PROJECT_DIR = SPECS_DIR / "project"
KICKOFF_DISCOVERY_PATHS = (
    Path("prd.md"),
    Path("docs/brief.md"),
    Path("docs/prd.md"),
    PROJECT_DIR / "kickoff.md",
    PROJECT_DIR / "requirements-brief.md",
)


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {DB_PATH}")
    print(f"  error   {message}")
    return code


def ok(message: str) -> int:
    print(f"[{GATE}] PASS - {message}")
    return EXIT_OK


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


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
        CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY,
            entity_id TEXT,
            kind TEXT NOT NULL,
            source_path TEXT,
            text TEXT NOT NULL,
            text_hash TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(
            id UNINDEXED,
            kind,
            source_path,
            text,
            tokenize='porter'
        );
        CREATE TABLE IF NOT EXISTS embeddings (
            chunk_id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            provider TEXT NOT NULL,
            dims INTEGER NOT NULL,
            text_hash TEXT NOT NULL,
            vector BLOB NOT NULL,
            updated_at TEXT NOT NULL
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


def upsert_chunk(
    conn: sqlite3.Connection,
    chunk_id: str,
    entity_id: str | None,
    kind: str,
    source_path: str,
    text: str,
    now: str,
) -> None:
    normalized = text.strip()
    if len(normalized) < 8:
        return

    digest = text_hash(normalized)
    conn.execute(
        """
        INSERT INTO chunks (id, entity_id, kind, source_path, text, text_hash, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            entity_id=excluded.entity_id,
            kind=excluded.kind,
            source_path=excluded.source_path,
            text=excluded.text,
            text_hash=excluded.text_hash,
            updated_at=excluded.updated_at
        """,
        (chunk_id, entity_id, kind, source_path, normalized, digest, now),
    )
    conn.execute("DELETE FROM chunk_fts WHERE id = ?", (chunk_id,))
    conn.execute(
        "INSERT INTO chunk_fts (id, kind, source_path, text) VALUES (?, ?, ?, ?)",
        (chunk_id, kind, source_path, normalized),
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


def chunk_spec_requirements(
    conn: sqlite3.Connection,
    feature_id: str,
    spec_path: Path,
    spec_text: str,
    now: str,
) -> int:
    count = 0
    matches = list(REQ_HEADING.finditer(spec_text))
    for index, match in enumerate(matches):
        req_id = match.group("id").upper()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(spec_text)
        body = spec_text[start:end].strip()
        if not body:
            continue
        chunk_id = f"chunk:{feature_id}:requirement:{req_id}"
        upsert_chunk(conn, chunk_id, req_id, "requirement", str(spec_path), body, now)
        count += 1
    return count


def chunk_task_bodies(
    conn: sqlite3.Connection,
    feature_id: str,
    tasks_path: Path,
    tasks_text: str,
    now: str,
) -> int:
    count = 0
    matches = list(TASK_HEADING.finditer(tasks_text))
    for index, match in enumerate(matches):
        task_id = match.group("id").upper()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(tasks_text)
        body = tasks_text[start:end].strip()
        if not body:
            body = match.group("title").strip() or task_id
        chunk_id = f"chunk:{feature_id}:task:{task_id}"
        upsert_chunk(conn, chunk_id, task_id, "task", str(tasks_path), body, now)
        count += 1
    return count


def prune_embeddings(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        DELETE FROM embeddings
        WHERE chunk_id NOT IN (SELECT id FROM chunks)
           OR chunk_id IN (
               SELECT e.chunk_id
               FROM embeddings e
               JOIN chunks c ON c.id = e.chunk_id
               WHERE e.text_hash != c.text_hash
           )
        """
    )


def latest_artifact_mtime() -> float | None:
    latest: float | None = None
    candidates = [SPECS_DIR / "lessons.json", SPECS_DIR / "STATE.md"]
    if FEATURES_DIR.is_dir():
        for feature_dir in FEATURES_DIR.iterdir():
            if not feature_dir.is_dir():
                continue
            for name in (
                "spec.md",
                "tasks.md",
                "design.md",
                "validation.md",
                "exploration.md",
            ):
                path = feature_dir / name
                if path.is_file():
                    candidates.append(path)

    for path in candidates:
        if path.is_file():
            mtime = path.stat().st_mtime
            latest = mtime if latest is None else max(latest, mtime)
    return latest


def has_indexable_artifacts() -> bool:
    if (SPECS_DIR / "lessons.json").is_file():
        return True
    if not FEATURES_DIR.is_dir():
        return False
    for feature_dir in FEATURES_DIR.iterdir():
        if not feature_dir.is_dir():
            continue
        for name in ("spec.md", "tasks.md", "design.md", "validation.md", "exploration.md"):
            if (feature_dir / name).is_file():
                return True
    return False


def chunk_markdown_sections(
    conn: sqlite3.Connection,
    feature_id: str,
    path: Path,
    text: str,
    kind: str,
    entity_id: str | None,
    now: str,
) -> int:
    count = 0
    matches = list(SECTION_HEADING.finditer(text))
    if not matches:
        chunk_id = f"chunk:{feature_id}:{kind}:body"
        upsert_chunk(conn, chunk_id, entity_id, kind, str(path), text, now)
        return 1

    for index, match in enumerate(matches):
        title = match.group(1).strip()
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "section"
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = f"## {title}\n{text[start:end]}".strip()
        chunk_id = f"chunk:{feature_id}:{kind}:{slug}"
        upsert_chunk(conn, chunk_id, entity_id, kind, str(path), body, now)
        count += 1
    return count


def index_lessons(conn: sqlite3.Connection, now: str) -> tuple[int, int]:
    lessons_path = SPECS_DIR / "lessons.json"
    if not lessons_path.is_file():
        return 0, 0

    payload = json.loads(lessons_path.read_text(encoding="utf-8"))
    entity_count = 0
    chunk_count = 0
    for lesson in payload.get("lessons") or []:
        lesson_id = str(lesson.get("id") or "").strip()
        if not lesson_id:
            continue
        status = str(lesson.get("status") or "").strip().lower()
        title = str(lesson.get("title") or lesson_id)
        upsert_entity(
            conn,
            lesson_id,
            "lesson",
            title,
            str(lesson.get("source") or ""),
            now,
        )
        entity_count += 1

        if status not in LESSON_STATUSES:
            continue

        body_parts = [title]
        for key in ("summary", "detail", "evidence", "recommendation"):
            value = lesson.get(key)
            if value:
                body_parts.append(str(value))
        body = "\n".join(body_parts).strip()
        chunk_id = f"chunk:lesson:{lesson_id}"
        upsert_chunk(conn, chunk_id, lesson_id, "lesson", str(lessons_path), body, now)
        chunk_count += 1

    return entity_count, chunk_count


def index_kickoff_docs(conn: sqlite3.Connection, now: str) -> tuple[int, int]:
    entity_count = 0
    chunk_count = 0
    seen: set[str] = set()

    for rel_path in KICKOFF_DISCOVERY_PATHS:
        path_key = str(rel_path).replace("\\", "/")
        if path_key in seen:
            continue
        seen.add(path_key)

        doc_path = Path(path_key)
        if not doc_path.is_file():
            continue

        entity_id = f"kickoff:{path_key.replace('/', ':')}"
        label = path_key
        text = doc_path.read_text(encoding="utf-8")
        upsert_entity(conn, entity_id, "kickoff", label, path_key, now)
        entity_count += 1
        chunk_count += chunk_markdown_sections(
            conn,
            "project",
            doc_path,
            text,
            "kickoff",
            entity_id,
            now,
        )

    feature_briefs_root = PROJECT_DIR / "feature-briefs"
    if feature_briefs_root.is_dir():
        for brief_path in sorted(feature_briefs_root.rglob("requirements-brief.md")):
            rel = brief_path.as_posix()
            slug = brief_path.parent.name
            entity_id = f"feature-brief:{slug}"
            text = brief_path.read_text(encoding="utf-8")
            upsert_entity(conn, entity_id, "feature-brief", slug, rel, now)
            entity_count += 1
            chunk_count += chunk_markdown_sections(
                conn,
                slug,
                brief_path,
                text,
                "feature-brief",
                entity_id,
                now,
            )

    return entity_count, chunk_count


def index_episodes(conn: sqlite3.Connection, now: str) -> tuple[int, int]:
    episodes_path = SPECS_DIR / "state" / "episodes.json"
    if not episodes_path.is_file():
        return 0, 0

    payload = json.loads(episodes_path.read_text(encoding="utf-8"))
    entity_count = 0
    chunk_count = 0

    for episode in payload.get("episodes") or []:
        episode_id = str(episode.get("id") or "").strip()
        if not episode_id:
            continue
        status = str(episode.get("status") or "").strip().lower()
        if status not in {"episodic", "archived", "promoted"}:
            continue

        feature_id = str(episode.get("feature_id") or "").strip() or None
        summary = str(episode.get("summary") or episode_id)
        upsert_entity(
            conn,
            episode_id,
            "episode",
            summary[:120],
            str(episodes_path),
            now,
        )
        entity_count += 1

        if feature_id:
            upsert_relation(conn, feature_id, episode_id, "contains")
            upsert_relation(conn, episode_id, feature_id, "documents")

        body_parts = [summary]
        for key in ("phase", "lesson_title", "lesson_rule"):
            value = episode.get(key)
            if value:
                body_parts.append(f"{key}: {value}")
        body = "\n".join(body_parts).strip()
        chunk_id = f"chunk:episode:{episode_id}"
        upsert_chunk(conn, chunk_id, episode_id, "episode", str(episodes_path), body, now)
        chunk_count += 1

    return entity_count, chunk_count


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
        conn.execute("DELETE FROM chunks")
        conn.execute("DELETE FROM chunk_fts")

        entity_count = 0
        relation_count = 0
        chunk_count = 0

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
                    chunk_count += chunk_spec_requirements(
                        conn, feature_id, spec_path, spec_text, now
                    )

                validation_path = feature_dir / "validation.md"
                if validation_path.is_file():
                    validation_text = validation_path.read_text(encoding="utf-8")
                    chunk_count += chunk_markdown_sections(
                        conn,
                        feature_id,
                        validation_path,
                        validation_text,
                        "validation",
                        feature_id,
                        now,
                    )

                design_path = feature_dir / "design.md"
                if design_path.is_file():
                    design_text = design_path.read_text(encoding="utf-8")
                    chunk_count += chunk_markdown_sections(
                        conn,
                        feature_id,
                        design_path,
                        design_text,
                        "design",
                        feature_id,
                        now,
                    )

                exploration_path = feature_dir / "exploration.md"
                if exploration_path.is_file():
                    exploration_text = exploration_path.read_text(encoding="utf-8")
                    chunk_count += chunk_markdown_sections(
                        conn,
                        feature_id,
                        exploration_path,
                        exploration_text,
                        "exploration",
                        feature_id,
                        now,
                    )

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

                    chunk_count += chunk_task_bodies(
                        conn, feature_id, tasks_path, tasks_text, now
                    )

        kickoff_entities, kickoff_chunks = index_kickoff_docs(conn, now)
        entity_count += kickoff_entities
        chunk_count += kickoff_chunks
        lesson_entities, lesson_chunks = index_lessons(conn, now)
        entity_count += lesson_entities
        chunk_count += lesson_chunks
        episode_entities, episode_chunks = index_episodes(conn, now)
        entity_count += episode_entities
        chunk_count += episode_chunks
        prune_embeddings(conn)
        conn.commit()

        summary = {
            "database": str(DB_PATH),
            "entities": entity_count,
            "relations": relation_count,
            "chunks": chunk_count,
            "updated_at": now,
        }

        if json_output:
            print(json.dumps(summary, indent=2))
        else:
            return ok(
                f"indexed {entity_count} entities, {relation_count} relations, "
                f"{chunk_count} chunks -> {DB_PATH}"
            )
        return EXIT_OK
    finally:
        conn.close()


def embed_chunks(force: bool = False, json_output: bool = False) -> int:
    config = load_memory_retrieval_config()
    if not config.get("semantic"):
        print(f"[{GATE}] semantic retrieval disabled — embed skipped (set memory.retrieval.semantic: true)")
        return EXIT_OK

    provider = str(config.get("provider") or "none")
    model = str(config.get("model") or "text-embedding-3-small")

    if not DB_PATH.is_file():
        return fail(f"{DB_PATH} not found — run `memory-index rebuild` first")

    try:
        embed_fn = get_embed_fn(provider, model)
    except RuntimeError as err:
        return fail(str(err))

    now = utc_now()
    conn = sqlite3.connect(DB_PATH)
    embedded = 0
    skipped = 0
    try:
        init_schema(conn)
        rows = conn.execute(
            "SELECT id, text, text_hash FROM chunks ORDER BY id"
        ).fetchall()

        for chunk_id, text, digest in rows:
            if not force:
                existing = conn.execute(
                    """
                    SELECT text_hash FROM embeddings
                    WHERE chunk_id = ? AND provider = ? AND model = ?
                    """,
                    (chunk_id, provider, model),
                ).fetchone()
                if existing and existing[0] == digest:
                    skipped += 1
                    continue

            vector = embed_fn(text)
            conn.execute(
                """
                INSERT INTO embeddings (chunk_id, model, provider, dims, text_hash, vector, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(chunk_id) DO UPDATE SET
                    model=excluded.model,
                    provider=excluded.provider,
                    dims=excluded.dims,
                    text_hash=excluded.text_hash,
                    vector=excluded.vector,
                    updated_at=excluded.updated_at
                """,
                (chunk_id, model, provider, len(vector), digest, pack_vector(vector), now),
            )
            embedded += 1

        conn.commit()
    finally:
        conn.close()

    summary = {"embedded": embedded, "skipped": skipped, "provider": provider, "model": model}
    if json_output:
        print(json.dumps(summary, indent=2))
    else:
        print(
            f"[{GATE}] embedded {embedded} chunk(s), skipped {skipped} "
            f"({provider}/{model})"
        )
    return EXIT_OK


def memory_status(json_output: bool = False) -> int:
    config = load_memory_retrieval_config()
    latest = latest_artifact_mtime()
    summary = {
        "database": str(DB_PATH),
        "exists": DB_PATH.is_file(),
        "semantic_enabled": bool(config.get("semantic")),
        "provider": str(config.get("provider") or "none"),
        "entities": 0,
        "chunks": 0,
        "embeddings": 0,
        "has_artifacts": has_indexable_artifacts(),
        "stale": False,
    }

    if DB_PATH.is_file():
        conn = sqlite3.connect(DB_PATH)
        try:
            init_schema(conn)
            summary["entities"] = conn.execute("SELECT COUNT(*) FROM entities").fetchone()[0]
            summary["chunks"] = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
            summary["embeddings"] = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
        finally:
            conn.close()
        if latest is not None:
            summary["stale"] = DB_PATH.stat().st_mtime < latest
    else:
        summary["stale"] = summary["has_artifacts"]

    if json_output:
        print(json.dumps(summary, indent=2))
    else:
        state = "ready" if summary["exists"] and not summary["stale"] else "needs attention"
        print(
            f"[{GATE}] memory index {state} — "
            f"{summary['chunks']} chunk(s), {summary['embeddings']} embedding(s)"
        )
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Rebuild SQLite memory index from .specs/")
    sub = parser.add_subparsers(dest="command")

    rebuild_cmd = sub.add_parser("rebuild", help="rebuild index from markdown artifacts")
    rebuild_cmd.add_argument("--json", action="store_true")
    rebuild_cmd.set_defaults(func=lambda args: rebuild(json_output=args.json))

    embed_cmd = sub.add_parser("embed", help="build optional semantic embeddings for chunks")
    embed_cmd.add_argument("--force", action="store_true")
    embed_cmd.add_argument("--json", action="store_true")
    embed_cmd.set_defaults(func=lambda args: embed_chunks(force=args.force, json_output=args.json))

    status_cmd = sub.add_parser("status", help="report index stats for doctor and tooling")
    status_cmd.add_argument("--json", action="store_true")
    status_cmd.set_defaults(func=lambda args: memory_status(json_output=args.json))

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
