#!/usr/bin/env python3
"""Plan the next Execute wave from tasks.md — parallel groups and sub-agent hints.

Run at the start of each /loop round (and after every batch completes):

    python3 loop_plan.py auth
    python3 loop_plan.py .specs/features/auth/tasks.md
    python3 loop_plan.py --json auth

Reads dependency edges and Files ownership from tasks.md. Tasks marked
`- [x] complete` are treated as done. The next wave is every incomplete task
whose dependencies are complete. Within that wave, tasks with disjoint Files
lists may run in parallel (sub-agents when 2+).

Exit codes: 0 plan emitted, 1 nothing ready / blocked, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from _common import resolve_artifact, visible_markdown
from _project_config import load_converge_config
from validate_tasks import parse_dependencies, parse_fields, parse_files, split_tasks

GATE = "loop-plan"
COMPLETE = re.compile(r"-\s*\[x\]\s*complete\b", re.IGNORECASE)
PARALLEL_GROUP = re.compile(
    r"^\|\s*(?:T)?(?P<id>\d{1,6})\s*\|.*?\|\s*(?P<group>[^|]+?)\s*\|",
    re.MULTILINE | re.IGNORECASE,
)


def is_complete(body: str) -> bool:
    return bool(COMPLETE.search(body))


def parse_parallel_groups(task_graph_text: str | None) -> dict[str, str]:
    if not task_graph_text:
        return {}

    groups: dict[str, str] = {}
    for match in PARALLEL_GROUP.finditer(task_graph_text):
        task_id = f"T{match.group('id')}"
        group = match.group("group").strip()
        if group and group not in {"—", "-", "n/a", "na", "none"}:
            groups[task_id] = group
    return groups


def build_plan(text: str, *, task_graph_text: str | None = None) -> dict:
    visible = visible_markdown(text)
    tasks = split_tasks(visible)
    graph: dict[str, list[str]] = {}
    files_by_task: dict[str, list[str]] = {}
    completed: set[str] = set()
    titles: dict[str, str] = {}

    for task_id, title, body in tasks:
        titles[task_id] = title
        fields = parse_fields(body)
        graph[task_id] = parse_dependencies(fields.get("depends on", ""))
        files_by_task[task_id] = parse_files(fields.get("files", ""))
        if is_complete(body):
            completed.add(task_id)

    incomplete = [task_id for task_id in graph if task_id not in completed]
    ready = [
        task_id
        for task_id in incomplete
        if all(dep in completed for dep in graph[task_id])
    ]

    parallel_groups_doc = parse_parallel_groups(task_graph_text)

    def files_disjoint(left: str, right: str) -> bool:
        left_files = set(files_by_task.get(left, []))
        right_files = set(files_by_task.get(right, []))
        return not left_files.intersection(right_files)

    groups: list[dict] = []
    remaining = set(ready)

    while remaining:
        batch: list[str] = []
        batch_files: set[str] = set()

        for task_id in sorted(remaining, key=lambda value: int(value[1:])):
            task_files = set(files_by_task.get(task_id, []))
            if task_files.intersection(batch_files):
                continue
            batch.append(task_id)
            batch_files.update(task_files)

        for task_id in batch:
            remaining.discard(task_id)

        mode = "parallel" if len(batch) > 1 else "inline"
        groups.append(
            {
                "mode": mode,
                "tasks": [
                    {
                        "id": task_id,
                        "title": titles.get(task_id, ""),
                        "files": files_by_task.get(task_id, []),
                        "parallel_group": parallel_groups_doc.get(task_id),
                    }
                    for task_id in batch
                ],
                "sub_agents": mode == "parallel",
            }
        )

    blocked = [
        {
            "id": task_id,
            "title": titles.get(task_id, ""),
            "waiting_on": [dep for dep in graph[task_id] if dep not in completed],
        }
        for task_id in incomplete
        if task_id not in ready
    ]

    return {
        "completed": sorted(completed, key=lambda value: int(value[1:])),
        "ready": ready,
        "groups": groups,
        "blocked": blocked,
        "all_done": not incomplete,
        "recommend_sub_agents": any(group["sub_agents"] for group in groups),
        "completed_count": len(completed),
    }


def apply_converge_hint(plan: dict, tasks_path: Path) -> None:
    """Attach /converge suggestion when completed tasks hit configured threshold."""

    feature_dir = tasks_path.parent
    if feature_dir.parent.name != "features":
        return

    root = feature_dir.parent.parent.parent
    policy = load_converge_config(root)
    mode = str(policy.get("mode", "suggest")).lower()
    every = int(policy.get("every_n_tasks", 5) or 0)

    if mode == "off" or every <= 0:
        return

    completed = plan.get("completed_count", len(plan.get("completed", [])))
    if completed <= 0 or completed % every != 0:
        return

    plan["converge_suggest"] = True
    plan["converge_mode"] = mode
    plan["converge_hint"] = (
        f"{completed} tasks complete — run /converge: analyze-artifacts, append gaps, "
        "feature-overview --write"
    )
    if mode == "warn":
        plan["converge_warning"] = True


def format_plan(plan: dict) -> str:
    lines: list[str] = []

    if plan["all_done"]:
        lines.append("All tasks complete — run /verify with a fresh context.")
        return "\n".join(lines)

    if not plan["ready"]:
        lines.append("No tasks ready — resolve blocked dependencies first.")
        for item in plan["blocked"][:5]:
            waiting = ", ".join(item["waiting_on"]) or "unknown"
            lines.append(f"  {item['id']}: waiting on {waiting}")
        return "\n".join(lines)

    lines.append("Next Execute wave:")
    for index, group in enumerate(plan["groups"], start=1):
        if group["mode"] == "parallel":
            lines.append(
                f"  Group {index} — PARALLEL ({len(group['tasks'])} tasks, use sub-agents):"
            )
        else:
            lines.append(f"  Group {index} — inline (orchestrator):")

        for task in group["tasks"]:
            files = ", ".join(task["files"]) or "(no files listed)"
            group_hint = ""
            if task.get("parallel_group"):
                group_hint = f" [graph group {task['parallel_group']}]"
            lines.append(f"    {task['id']}: {task['title']} — {files}{group_hint}")

    if plan["recommend_sub_agents"]:
        lines.append("")
        lines.append(
            "Sub-agents: offer parallel dispatch per references/sub-agents.md "
            "(owner must confirm before spawning)."
        )

    if plan["blocked"]:
        lines.append("")
        lines.append("Blocked (later waves):")
        for item in plan["blocked"][:5]:
            waiting = ", ".join(item["waiting_on"])
            lines.append(f"  {item['id']}: after {waiting}")

    if plan.get("converge_hint"):
        lines.append("")
        prefix = "Converge (warn): " if plan.get("converge_warning") else "Converge (suggest): "
        lines.append(prefix + plan["converge_hint"])

    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Plan the next Execute wave with parallel groups"
    )
    parser.add_argument(
        "tasks",
        nargs="?",
        help="feature name, feature directory, or path to tasks.md",
    )
    parser.add_argument("--json", action="store_true", help="emit JSON for agents")
    args = parser.parse_args(argv)

    path, text = resolve_artifact(args.tasks, "tasks.md", GATE)
    graph_path = path.parent / "task-graph.md"
    graph_text = (
        graph_path.read_text(encoding="utf-8") if graph_path.is_file() else None
    )
    plan = build_plan(text, task_graph_text=graph_text)
    apply_converge_hint(plan, path)

    if args.json:
        print(json.dumps(plan, indent=2))
    else:
        print(format_plan(plan))

    if plan["all_done"]:
        return 0
    if not plan["ready"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
