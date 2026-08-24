#!/usr/bin/env python3
"""Episodic memory lifecycle for `.specs/state/episodes.json`.

Working session notes graduate to episodic memory, then archive or promote to lessons.

    python3 episodes.py record --summary "..." [--feature 001-auth] [--phase Execute]
    python3 episodes.py list [--status episodic]
    python3 episodes.py archive EP-001
    python3 episodes.py prune [--days 90]
    python3 episodes.py promote EP-001 --title "..." --rule "..."

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE
from _memory_config import load_memory_lifecycle_config

GATE = "episodes"
STORE_PATH = Path(".specs/state/episodes.json")
STATE_PATH = Path(".specs/STATE.md")
STATUSES = ("working", "episodic", "archived", "promoted")
INDEXABLE_STATUSES = {"episodic", "archived", "promoted"}


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {STORE_PATH}")
    print(f"  error   {message}")
    return code


def ok(message: str) -> int:
    print(f"[{GATE}] PASS - {message}")
    return EXIT_OK


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_store() -> dict:
    if not STORE_PATH.is_file():
        return {"episodes": []}
    return json.loads(STORE_PATH.read_text(encoding="utf-8"))


def save_store(store: dict) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORE_PATH.write_text(json.dumps(store, indent=2) + "\n", encoding="utf-8")


def next_episode_id(store: dict) -> str:
    max_id = 0
    for episode in store.get("episodes") or []:
        match = re.fullmatch(r"EP-(\d+)", str(episode.get("id") or ""), re.IGNORECASE)
        if match:
            max_id = max(max_id, int(match.group(1)))
    return f"EP-{max_id + 1:03d}"


def read_state_feature() -> str | None:
    if not STATE_PATH.is_file():
        return None
    for line in STATE_PATH.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^-\s*Feature:\s*(.+)$", line.strip())
        if match:
            value = match.group(1).strip()
            if value and value not in {"—", "-"}:
                return value
    return None


def read_state_phase() -> str | None:
    if not STATE_PATH.is_file():
        return None
    for line in STATE_PATH.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^-\s*Phase:\s*(.+)$", line.strip())
        if match:
            value = match.group(1).strip()
            if value and value not in {"—", "-"}:
                return value
    return None


def find_episode(store: dict, episode_id: str) -> dict | None:
    target = episode_id.upper()
    for episode in store.get("episodes") or []:
        if str(episode.get("id") or "").upper() == target:
            return episode
    return None


def record_episode(summary: str, feature_id: str | None, phase: str | None, json_output: bool) -> int:
    summary = summary.strip()
    if not summary:
        return fail("summary is required")

    store = load_store()
    episode = {
        "id": next_episode_id(store),
        "feature_id": feature_id or read_state_feature(),
        "phase": phase or read_state_phase(),
        "summary": summary,
        "status": "working",
        "recorded_at": utc_now(),
        "source": "manual",
    }
    store.setdefault("episodes", []).append(episode)
    save_store(store)

    if json_output:
        print(json.dumps(episode, indent=2))
    else:
        ok(f"recorded {episode['id']} ({episode['status']})")
    return EXIT_OK


def list_episodes(status: str | None, json_output: bool) -> int:
    store = load_store()
    episodes = store.get("episodes") or []
    if status:
        episodes = [ep for ep in episodes if str(ep.get("status") or "").lower() == status.lower()]

    if json_output:
        print(json.dumps({"count": len(episodes), "episodes": episodes}, indent=2))
    else:
        for episode in episodes:
            print(
                f"{episode.get('id')} [{episode.get('status')}] "
                f"{episode.get('feature_id') or '-'} — {episode.get('summary')}"
            )
    return EXIT_OK


def archive_episode(episode_id: str, json_output: bool) -> int:
    store = load_store()
    episode = find_episode(store, episode_id)
    if not episode:
        return fail(f"episode not found: {episode_id}")

    if episode.get("status") != "working":
        return fail(f"only working episodes can be archived (current: {episode.get('status')})")

    episode["status"] = "episodic"
    episode["archived_at"] = utc_now()
    save_store(store)

    if json_output:
        print(json.dumps(episode, indent=2))
    else:
        ok(f"archived {episode['id']} -> episodic")
    return EXIT_OK


def prune_episodes(days: int | None, json_output: bool) -> int:
    config = load_memory_lifecycle_config()
    retention = days if days is not None else int(config.get("retention_days") or 90)
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention)

    store = load_store()
    kept = []
    removed = []
    for episode in store.get("episodes") or []:
        if str(episode.get("status") or "") != "episodic":
            kept.append(episode)
            continue
        raw = str(episode.get("archived_at") or episode.get("recorded_at") or "")
        try:
            recorded = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            kept.append(episode)
            continue
        if recorded < cutoff:
            removed.append(episode)
        else:
            kept.append(episode)

    store["episodes"] = kept
    save_store(store)

    summary = {"removed": len(removed), "retention_days": retention, "ids": [ep["id"] for ep in removed]}
    if json_output:
        print(json.dumps(summary, indent=2))
    else:
        ok(f"pruned {len(removed)} episodic episode(s) older than {retention} days")
    return EXIT_OK


def promote_episode(episode_id: str, title: str, rule: str, json_output: bool) -> int:
    store = load_store()
    episode = find_episode(store, episode_id)
    if not episode:
        return fail(f"episode not found: {episode_id}")

    if episode.get("status") not in {"episodic", "archived"}:
        return fail(f"only episodic/archived episodes can be promoted (current: {episode.get('status')})")

    title = title.strip() or str(episode.get("summary") or episode_id)
    rule = rule.strip() or str(episode.get("summary") or "")
    if not rule:
        return fail("rule is required for promotion")

    episode["status"] = "promoted"
    episode["promoted_at"] = utc_now()
    episode["lesson_title"] = title
    episode["lesson_rule"] = rule
    save_store(store)

    if json_output:
        print(json.dumps(episode, indent=2))
    else:
        ok(f"promoted {episode['id']} — feed into lessons.py add when grounded in validation")
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Episodic memory lifecycle")
    sub = parser.add_subparsers(dest="command")

    record = sub.add_parser("record", help="capture a working-session episode")
    record.add_argument("--summary", required=True)
    record.add_argument("--feature")
    record.add_argument("--phase")
    record.add_argument("--json", action="store_true")
    record.set_defaults(
        func=lambda args: record_episode(args.summary, args.feature, args.phase, args.json)
    )

    list_cmd = sub.add_parser("list", help="list episodes")
    list_cmd.add_argument("--status", choices=STATUSES)
    list_cmd.add_argument("--json", action="store_true")
    list_cmd.set_defaults(func=lambda args: list_episodes(args.status, args.json))

    archive = sub.add_parser("archive", help="move working -> episodic")
    archive.add_argument("episode_id")
    archive.add_argument("--json", action="store_true")
    archive.set_defaults(func=lambda args: archive_episode(args.episode_id, args.json))

    prune = sub.add_parser("prune", help="drop old episodic episodes")
    prune.add_argument("--days", type=int)
    prune.add_argument("--json", action="store_true")
    prune.set_defaults(func=lambda args: prune_episodes(args.days, args.json))

    promote = sub.add_parser("promote", help="mark episode promoted for lesson graduation")
    promote.add_argument("episode_id")
    promote.add_argument("--title")
    promote.add_argument("--rule")
    promote.add_argument("--json", action="store_true")
    promote.set_defaults(
        func=lambda args: promote_episode(args.episode_id, args.title or "", args.rule or "", args.json)
    )

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
