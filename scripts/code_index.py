#!/usr/bin/env python3
"""Lightweight brownfield code index — shallow file/symbol map, not full RepoGraph.

    python3 code_index.py rebuild [--roots src,lib] [--json]
    python3 code_index.py search "auth" [--json]

Exit codes: 0 ok, 1 failure, 2 usage error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from _common import EXIT_FAILED, EXIT_OK, EXIT_USAGE

GATE = "code-index"
INDEX_PATH = Path(".specs/memory/code-index.json")
DEFAULT_ROOTS = ("src", "lib", "app", "packages", "internal", "cmd")
SKIP_DIRS = {
    ".git",
    ".specs",
    ".cursor",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "vendor",
    "__pycache__",
    ".next",
    ".turbo",
}
CODE_EXTENSIONS = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
}
SYMBOL_PATTERNS = {
    "typescript": [
        re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)", re.MULTILINE),
        re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)", re.MULTILINE),
        re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_]\w*)\s*=", re.MULTILINE),
    ],
    "python": [
        re.compile(r"^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)", re.MULTILINE),
        re.compile(r"^\s*class\s+([A-Za-z_]\w*)", re.MULTILINE),
    ],
    "javascript": [
        re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)", re.MULTILINE),
        re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)", re.MULTILINE),
    ],
    "go": [
        re.compile(r"^\s*func\s+(?:\([^)]+\)\s+)?([A-Za-z_]\w*)", re.MULTILINE),
        re.compile(r"^\s*type\s+([A-Za-z_]\w*)\s+", re.MULTILINE),
    ],
    "rust": [
        re.compile(r"^\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*)", re.MULTILINE),
        re.compile(r"^\s*(?:pub\s+)?struct\s+([A-Za-z_]\w*)", re.MULTILINE),
    ],
}
IMPORT_PATTERN = re.compile(
    r"^\s*(?:import|from|require\(|use)\s+['\"]?([^'\";\n]+)",
    re.MULTILINE,
)


def fail(message: str, code: int = EXIT_FAILED) -> int:
    print(f"[{GATE}] FAIL - {INDEX_PATH}")
    print(f"  error   {message}")
    return code


def ok(message: str) -> int:
    print(f"[{GATE}] PASS - {message}")
    return EXIT_OK


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def discover_roots(explicit: list[str] | None) -> list[Path]:
    if explicit:
        return [Path(root) for root in explicit if root.strip()]
    return [Path(root) for root in DEFAULT_ROOTS if Path(root).is_dir()]


def extract_symbols(language: str, text: str) -> list[str]:
    symbols: list[str] = []
    for pattern in SYMBOL_PATTERNS.get(language, []):
        for match in pattern.finditer(text):
            name = match.group(1)
            if name and name not in symbols:
                symbols.append(name)
    return symbols[:40]


def extract_imports(text: str) -> list[str]:
    imports: list[str] = []
    for match in IMPORT_PATTERN.finditer(text):
        value = match.group(1).strip().strip("'\"")
        if value and value not in imports:
            imports.append(value)
    return imports[:20]


def scan_file(path: Path) -> dict | None:
    suffix = path.suffix.lower()
    language = CODE_EXTENSIONS.get(suffix)
    if not language:
        return None

    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None

    if len(text) > 250_000:
        text = text[:250_000]

    return {
        "path": path.as_posix(),
        "language": language,
        "symbols": extract_symbols(language, text),
        "imports": extract_imports(text),
    }


def rebuild(roots: list[str] | None, json_output: bool) -> int:
    scan_roots = discover_roots(roots)
    if not scan_roots:
        return fail("no code roots found — pass --roots src,lib or run from a repo with src/")

    files: list[dict] = []
    for root in scan_roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            entry = scan_file(path)
            if entry:
                files.append(entry)

    payload = {
        "updated_at": utc_now(),
        "roots": [root.as_posix() for root in scan_roots],
        "files": sorted(files, key=lambda item: item["path"]),
        "file_count": len(files),
    }

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    if json_output:
        print(json.dumps(payload, indent=2))
    else:
        ok(f"indexed {len(files)} file(s) -> {INDEX_PATH}")
    return EXIT_OK


def search(query: str, json_output: bool) -> int:
    if not INDEX_PATH.is_file():
        return fail(f"{INDEX_PATH} not found — run `code-index rebuild` first")

    needle = query.lower().strip()
    payload = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    results = []
    for entry in payload.get("files") or []:
        haystack = " ".join(
            [entry.get("path", ""), *entry.get("symbols", []), *entry.get("imports", [])]
        ).lower()
        if needle in haystack:
            results.append(entry)

    summary = {"query": query, "count": len(results), "results": results[:50]}
    if json_output:
        print(json.dumps(summary, indent=2))
    else:
        for entry in summary["results"]:
            symbols = ", ".join(entry.get("symbols") or []) or "(no symbols)"
            print(f"{entry['path']} [{entry['language']}] — {symbols}")
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lightweight brownfield code index")
    sub = parser.add_subparsers(dest="command")

    rebuild_cmd = sub.add_parser("rebuild", help="scan code roots and write code-index.json")
    rebuild_cmd.add_argument("--roots")
    rebuild_cmd.add_argument("--json", action="store_true")
    rebuild_cmd.set_defaults(
        func=lambda args: rebuild(
            [part.strip() for part in args.roots.split(",")] if args.roots else None,
            args.json,
        )
    )

    search_cmd = sub.add_parser("search", help="search indexed files/symbols")
    search_cmd.add_argument("query")
    search_cmd.add_argument("--json", action="store_true")
    search_cmd.set_defaults(func=lambda args: search(args.query, args.json))

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
