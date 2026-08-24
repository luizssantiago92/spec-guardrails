"""Shared helpers for the Spec Guardrails structural gates.

Gates are deterministic: they read an artifact, apply structural checks, and exit
non-zero when the artifact is not ready for the next phase. They never mutate
project files.

Exit codes:
    0 - gate passed (warnings may still be printed)
    1 - gate failed; fix the artifact before proceeding
    2 - usage error (missing file, bad arguments)
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_USAGE = 2

# Angle brackets are ambiguous: `<fill me>` is an unfilled template, but
# `Promise<void>` and `List<User>` are types a real acceptance criterion may
# name. Only flag bracketed text that reads like prose (contains a space) or
# matches a known template token, so typed specs are not rejected.
ANGLE_TEMPLATE_TOKEN = (
    r"tbd|todo|fixme|xxx|placeholder|fill[ -]?(?:me|in|this)?|"
    r"your[ -][a-z0-9 _-]+|insert[ -][a-z0-9 _-]+"
)

PLACEHOLDER_PATTERNS = (
    re.compile(r"\bTBD\b", re.IGNORECASE),
    re.compile(r"\bTODO\b"),
    re.compile(r"\bFIXME\b"),
    re.compile(r"\bXXX\b"),
    re.compile(rf"<\s*(?:{ANGLE_TEMPLATE_TOKEN})\s*>", re.IGNORECASE),
    re.compile(r"<[a-z][a-z0-9_-]*(?:[ ][a-z0-9_-]+)+>", re.IGNORECASE),
    # `[name]` style templates, but never a markdown link such as `[label](url)`
    # and never a task checkbox such as `- [x]`.
    re.compile(
        r"\[(?:feature|name|description|fill me|placeholder)\](?!\()",
        re.IGNORECASE,
    ),
)


@dataclass
class Report:
    """Collects gate findings and renders a deterministic summary."""

    gate: str
    target: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    checks: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    @property
    def passed(self) -> bool:
        return not self.errors

    def emit(self, strict: bool = False) -> int:
        status = "PASS" if self.passed else "FAIL"
        print(f"[{self.gate}] {status} - {self.target}")

        for check in self.checks:
            print(f"  info      {check}")
        for warning in self.warnings:
            print(f"  warning   {warning}")
        for error in self.errors:
            print(f"  blocking  {error}")

        if strict and self.warnings and self.passed:
            print("  blocking  strict mode: warnings are treated as failures")
            return EXIT_FAILED

        if not self.passed:
            print(
                f"\n{len(self.errors)} blocking issue(s). "
                "Fix the artifact and re-run this gate before proceeding."
            )
            return EXIT_FAILED

        if self.warnings:
            print(
                f"\n{len(self.warnings)} warning(s), 0 blocking — gate passed "
                "(use --strict to treat warnings as blocking)"
            )

        return EXIT_OK


FEATURES_DIR = Path(".specs/features")

FEATURE_ID_PATTERN = re.compile(r"^\d{3}-[a-z0-9][a-z0-9-]*$")

REQUIREMENT_ID = re.compile(
    r"^(?P<level>#{2,6})\s*(?P<id>[A-Z][A-Z0-9]{1,9}-\d{2,4})\b",
    re.MULTILINE,
)
REQUIREMENTS_HEADING = re.compile(
    r"^(?P<level>#{2,6})\s*Requirements\b",
    re.MULTILINE | re.IGNORECASE,
)
ANY_HEADING = re.compile(r"^(?P<level>#{1,6})\s", re.MULTILINE)
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)


def section_body(text: str, heading: re.Pattern[str]) -> str | None:
    """Return the body of the first matching section, or None if absent."""

    match = heading.search(text)
    if not match:
        return None

    level = len(match.group("level"))
    start = match.end()
    end = len(text)
    for next_heading in ANY_HEADING.finditer(text, start):
        if len(next_heading.group("level")) <= level:
            end = next_heading.start()
            break
    return text[start:end]


def requirement_ids(text: str) -> list[str]:
    """Return requirement IDs from markdown headings under `## Requirements`.

    Headings under Assumptions, Out of Scope, or other sections are ignored so
    NOTE-001-style notes never become coverage obligations.
    """

    body = section_body(text, REQUIREMENTS_HEADING)
    search_text = body if body is not None else text
    seen: set[str] = set()
    ordered: list[str] = []
    for match in REQUIREMENT_ID.finditer(search_text):
        requirement_id = match.group("id")
        if requirement_id not in seen:
            seen.add(requirement_id)
            ordered.append(requirement_id)
    return ordered


def mask_fenced_blocks(text: str) -> str:
    """Blank out fenced code so structural regexes ignore sample snippets.

    Fence marker lines and their interiors become empty lines, so line numbers
    stay aligned with the original document.
    """

    masked: list[str] = []
    in_fence = False

    for line in text.splitlines(keepends=True):
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            masked.append("\n" if line.endswith("\n") else "")
            continue
        if in_fence:
            masked.append("\n" if line.endswith("\n") else "")
            continue
        masked.append(line)

    return "".join(masked)


def strip_html_comments(text: str) -> str:
    """Blank HTML comments so evidence and verdicts inside them do not count."""

    return HTML_COMMENT.sub(lambda match: "\n" * match.group(0).count("\n"), text)


def visible_markdown(text: str) -> str:
    """Markdown visible to structural gates: fences and HTML comments removed."""

    return mask_fenced_blocks(strip_html_comments(text))


def normalize_file_path(raw: str) -> str:
    """Strip markdown/noise and collapse `./`, `/`, quotes, links, and `..`.

    Result is case-folded so Auth/Token.ts and auth/token.ts collide on overlap
    checks (macOS/Windows volumes; also stops casing dodges).
    """

    cleaned = raw.strip().strip("`\"'").replace("\\", "/")
    link = re.fullmatch(r"\[([^\]]*)\]\(([^)]+)\)", cleaned)
    if link:
        cleaned = link.group(2).strip().strip("`\"'")
    while cleaned.startswith("./"):
        cleaned = cleaned[2:]
    cleaned = cleaned.lstrip("/")
    cleaned = re.sub(r"^[A-Za-z]:/", "", cleaned)
    cleaned = cleaned.rstrip("/")

    parts: list[str] = []
    for part in cleaned.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if parts:
                parts.pop()
            continue
        parts.append(part)
    return "/".join(parts).casefold()


def _fail_usage(gate: str, target: str, message: str) -> None:
    print(f"[{gate}] FAIL - {target}")
    print(f"  error   {message}")
    sys.exit(EXIT_USAGE)


def is_valid_feature_id(feature_id: str) -> bool:
    return bool(FEATURE_ID_PATTERN.match(feature_id))


def _feature_dir_under_root(feature_dir: Path, root: Path) -> bool:
    features_root = (root / FEATURES_DIR).resolve()
    try:
        resolved = feature_dir.resolve()
        relative = resolved.relative_to(features_root)
    except ValueError:
        return False
    if not relative.parts:
        return False
    return is_valid_feature_id(relative.parts[0])


def list_features(root: Path = Path(".")) -> list[Path]:
    """Return every feature directory under `.specs/features`, sorted by name."""

    base = root / FEATURES_DIR

    if not base.is_dir():
        return []

    return sorted(
        path
        for path in base.iterdir()
        if path.is_dir() and is_valid_feature_id(path.name)
    )


def resolve_feature_dir(
    raw: str | None, gate: str, root: Path = Path(".")
) -> Path:
    """Resolve a feature directory from a path, a bare feature name, or context.

    Accepts `.specs/features/001-auth/spec.md`, `.specs/features/001-auth`,
    `001-auth`, or nothing at all when the project has exactly one feature.
    """

    if raw:
        if raw in (".", "..") or ".." in Path(raw).parts:
            _fail_usage(
                gate,
                raw,
                f"invalid feature id: {raw} (expected NNN-slug)",
            )

        candidate = Path(raw).expanduser()

        if candidate.is_file():
            feature_dir = candidate.parent
            if not _feature_dir_under_root(feature_dir, root):
                _fail_usage(gate, raw, f"no such feature or path: {raw}")
            return feature_dir

        if candidate.is_dir():
            if not _feature_dir_under_root(candidate, root):
                _fail_usage(gate, raw, f"no such feature or path: {raw}")
            return candidate

        if not is_valid_feature_id(raw):
            _fail_usage(
                gate,
                raw,
                f"invalid feature id: {raw} (expected NNN-slug)",
            )

        named = root / FEATURES_DIR / raw
        if named.is_dir():
            return named

        _fail_usage(gate, raw, f"no such feature or path: {raw}")

    features = list_features(root)

    if len(features) == 1:
        return features[0]

    if not features:
        _fail_usage(
            gate,
            str(root / FEATURES_DIR),
            "no features found - create .specs/features/[feature]/ first",
        )

    listed = "\n".join(f"            {path.name}" for path in features)
    _fail_usage(
        gate,
        str(root / FEATURES_DIR),
        f"{len(features)} features found - name the one to check:\n{listed}",
    )

    raise AssertionError("unreachable")


def resolve_artifact(
    raw: str | None, filename: str, gate: str, root: Path = Path(".")
) -> tuple[Path, str]:
    """Read `filename` from a feature resolved by path, name, or auto-detection."""

    if raw:
        candidate = Path(raw).expanduser()
        if candidate.is_file():
            if candidate.name != filename:
                _fail_usage(
                    gate,
                    raw,
                    f"expected {filename}, got {candidate.name}",
                )
            return read_artifact(str(candidate), gate)

    feature_dir = resolve_feature_dir(raw, gate, root)
    return read_artifact(str(feature_dir / filename), gate)


def read_artifact(raw_path: str, report_gate: str) -> tuple[Path, str]:
    """Resolve and read a required artifact.

    Missing paths and directories exit with EXIT_USAGE. An empty file exits
    with EXIT_FAILED — the path is valid, the artifact is not ready.
    """

    path = Path(raw_path).expanduser()

    if not path.exists():
        print(f"[{report_gate}] FAIL - {path}")
        print(f"  error   file not found: {path}")
        sys.exit(EXIT_USAGE)

    if path.is_dir():
        print(f"[{report_gate}] FAIL - {path}")
        print(f"  error   expected a file, got a directory: {path}")
        sys.exit(EXIT_USAGE)

    text = path.read_text(encoding="utf-8")

    if not text.strip():
        print(f"[{report_gate}] FAIL - {path}")
        print("  error   file is empty")
        sys.exit(EXIT_FAILED)

    return path, text


def find_placeholders(text: str) -> list[str]:
    """Return unresolved placeholder tokens found in visible markdown.

    Fenced samples and HTML comments are ignored, matching the other gates.
    """

    found: list[str] = []

    for line_number, line in enumerate(visible_markdown(text).splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        is_heading = stripped.startswith("#")
        for pattern in PLACEHOLDER_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            token = match.group(0)
            # Task titles such as "Fix TODO later" describe the work; TBD and
            # template holes in a heading are still unfilled and must block.
            if is_heading and token.upper() in {"TODO", "FIXME"}:
                continue
            found.append(f"line {line_number}: {token}")
            break

    return found


def has_section(text: str, heading: str) -> bool:
    """Case-insensitive check for a markdown heading anywhere in the document."""

    pattern = re.compile(rf"^#{{1,6}}\s+{re.escape(heading)}\s*$", re.IGNORECASE | re.MULTILINE)
    return bool(pattern.search(text))
