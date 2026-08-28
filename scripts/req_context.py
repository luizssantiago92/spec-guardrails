#!/usr/bin/env python3
"""Assemble kickoff + requirements brief context for the Specify phase.

    python3 req_context.py --scope project
    python3 req_context.py --scope feature --slug settings-page
    python3 req_context.py --json

Read-only: lists discovered sources and brief paths; does not mutate files.
Exit codes: 0 success, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_DIR = Path(".specs/project")
KICKOFF_PATHS = (
    Path("prd.md"),
    Path("docs/brief.md"),
    Path("docs/prd.md"),
    PROJECT_DIR / "kickoff.md",
)
PROJECT_BRIEF = PROJECT_DIR / "requirements-brief.md"
FEATURE_BRIEFS = PROJECT_DIR / "feature-briefs"


def discover_sources(root: Path) -> list[dict[str, str | bool]]:
    entries: list[dict[str, str | bool]] = []
    seen: set[str] = set()
    for rel in KICKOFF_PATHS:
        key = rel.as_posix()
        if key in seen:
            continue
        seen.add(key)
        path = root / rel
        entries.append({"path": key, "exists": path.is_file()})
    return entries


def resolve_brief(root: Path, scope: str, slug: str | None) -> Path | None:
    if scope == "project":
        candidate = root / PROJECT_BRIEF
        return candidate if candidate.is_file() else None

    if not slug:
        briefs_root = root / FEATURE_BRIEFS
        if not briefs_root.is_dir():
            return None
        matches = sorted(briefs_root.rglob("requirements-brief.md"))
        return matches[0] if len(matches) == 1 else None

    candidate = root / FEATURE_BRIEFS / slug / "requirements-brief.md"
    return candidate if candidate.is_file() else None


def excerpt(path: Path, max_chars: int = 1200) -> str:
    text = path.read_text(encoding="utf-8")
    trimmed = text.strip()
    if len(trimmed) <= max_chars:
        return trimmed
    return f"{trimmed[: max_chars - 3].rstrip()}..."


def build_context(root: Path, scope: str, slug: str | None) -> dict:
    sources = discover_sources(root)
    brief = resolve_brief(root, scope, slug)
    payload: dict = {
        "scope": scope,
        "sources": sources,
        "brief_path": brief.relative_to(root).as_posix() if brief else None,
    }
    if brief:
        payload["brief_excerpt"] = excerpt(brief)
    if scope == "feature" and slug:
        payload["slug"] = slug
    return payload


def format_markdown(ctx: dict) -> str:
    lines = [
        "# Requirements context",
        "",
        f"Scope: **{ctx['scope']}**",
        "",
        "## Kickoff sources",
        "",
    ]
    for entry in ctx["sources"]:
        label = "found" if entry["exists"] else "missing"
        lines.append(f"- [{label}] {entry['path']}")

    lines.extend(["", "## Requirements brief", ""])
    if ctx.get("brief_path"):
        lines.append(f"- Path: `{ctx['brief_path']}`")
        if ctx.get("brief_excerpt"):
            lines.extend(["", "### Excerpt", "", "```markdown", ctx["brief_excerpt"], "```"])
    else:
        lines.append("- No requirements brief found for this scope.")

    lines.extend(
        [
            "",
            "## Next",
            "",
            "- Run `validate-req-analysis` on the brief before `/specify`",
            "- Derive spec.md from the brief — do not re-ask resolved questions",
        ]
    )
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Requirements context for Specify")
    parser.add_argument(
        "--scope",
        choices=("project", "feature"),
        default="project",
        help="Elicitation scope (default: project)",
    )
    parser.add_argument(
        "--slug",
        help="Feature slug when scope=feature (default: sole feature brief if only one exists)",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of markdown")
    args = parser.parse_args(argv)

    if args.scope == "feature" and args.slug and not args.slug.strip():
        print("[req-context] USAGE - --slug must not be empty", file=sys.stderr)
        return 2

    ctx = build_context(Path("."), args.scope, args.slug.strip() if args.slug else None)

    if args.json:
        print(json.dumps(ctx, indent=2))
    else:
        print(format_markdown(ctx), end="")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
