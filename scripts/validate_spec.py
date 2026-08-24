#!/usr/bin/env python3
"""Closure gate for `.specs/features/[feature]/spec.md`.

Run before confirming a spec with the project owner:

    python3 validate_spec.py .specs/features/auth/spec.md

The feature can be named instead of pathed:

    python3 validate_spec.py auth
    python3 validate_spec.py            # when the project has a single feature

Checks (full spec):
  * required sections are present (Requirements, Assumptions, Out of Scope)
  * at least one well-formed requirement ID (REQ-001 style)
  * every requirement carries at least one acceptance criterion
  * every criterion states a required outcome (SHALL or MUST)
  * no unresolved placeholders (TBD, TODO, <fill me>) outside fences and HTML comments
  * EARS shape (WHEN ... THEN ...) is reported as a warning
  * open [NEEDS CLARIFICATION] markers are reported as warnings

Checks (delta spec — when ADDED/MODIFIED/REMOVED sections are present):
  * Goal and Assumptions required; Out of Scope recommended
  * ADDED/MODIFIED requirements follow the same SHALL/MUST rules
  * REMOVED lists requirement IDs to retire

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import sys

from _common import (
    REQUIREMENTS_HEADING,
    Report,
    find_placeholders,
    has_section,
    resolve_artifact,
    section_body,
    visible_markdown,
)

GATE = "validate-spec"

REQUIREMENT_HEADING = re.compile(
    r"^(?P<level>#{2,6})\s*(?P<id>[A-Z][A-Z0-9]{1,9}-\d{2,4})\s*[:\-–]?\s*(?P<title>.*)$",
    re.MULTILINE,
)
ANY_HEADING = re.compile(r"^(?P<level>#{1,6})\s+\S", re.MULTILINE)
MALFORMED_ID = re.compile(r"^#{2,6}\s*(REQ|req)[\s_]*(\d{1,4})\b", re.MULTILINE)
ACCEPTANCE_LABEL = re.compile(r"(acceptance criteri|\bAC\b)", re.IGNORECASE)
METADATA_KEY = re.compile(
    r"^\*{0,2}(owner|priority|status|estimate|risk|risks|files|file|notes|note|"
    r"tags|links|link|related|depends on|reuses|source|epic|milestone)\*{0,2}\s*:",
    re.IGNORECASE,
)
# A criterion without a normative verb states an intention, not an outcome a test
# can assert, so it blocks. The EARS lead keyword sharpens it further and is
# reported as a warning.
NORMATIVE_VERB = re.compile(r"\b(SHALL|MUST)\b", re.IGNORECASE)
EARS_LEAD = re.compile(
    r"\b(WHEN|IF|WHILE|WHERE)\b.*\bTHEN\b", re.IGNORECASE | re.DOTALL
)
REQUIRED_SECTIONS = ("Requirements", "Assumptions", "Out of Scope")
DELTA_SECTIONS = (
    ("ADDED Requirements", "added"),
    ("MODIFIED Requirements", "modified"),
    ("REMOVED Requirements", "removed"),
)
CLARIFICATION = re.compile(r"\[NEEDS CLARIFICATION(?:\s*:\s*[^\]]+)?\]", re.IGNORECASE)
AMBIGUOUS_TERMS = re.compile(
    r"\b(etc\.?|and so on|as appropriate|as needed|somehow|maybe|when possible)\b",
    re.IGNORECASE,
)
OUT_OF_SCOPE_HEADING = re.compile(
    r"^(?P<level>#{2,6})\s*Out of Scope\b",
    re.MULTILINE | re.IGNORECASE,
)
REMOVED_ID = re.compile(r"^\s*(?:-\s*)?(?P<id>[A-Z][A-Z0-9]{1,9}-\d{2,4})\b", re.MULTILINE)


def is_delta_spec(text: str) -> bool:
    visible = visible_markdown(text)
    return any(has_section(visible, heading) for heading, _ in DELTA_SECTIONS)


def split_requirements(text: str) -> list[tuple[str, str, str]]:
    """Return (id, title, body) for each requirement heading under ``## Requirements``.

    Headings under Assumptions, Out of Scope, or other sections are ignored so
    NOTE-001-style notes never become acceptance-criteria obligations. A
    requirement body ends at the next heading of the same or higher level.
    """

    scoped = section_body(text, REQUIREMENTS_HEADING)
    if scoped is None:
        return []

    requirements: list[tuple[str, str, str]] = []

    for match in REQUIREMENT_HEADING.finditer(scoped):
        level = len(match.group("level"))
        start = match.end()
        end = len(scoped)

        for heading in ANY_HEADING.finditer(scoped, start):
            if len(heading.group("level")) <= level:
                end = heading.start()
                break

        requirements.append(
            (match.group("id"), match.group("title").strip(), scoped[start:end])
        )

    return requirements


def split_delta_requirements(text: str, section_heading: str) -> list[tuple[str, str, str]]:
    scoped = section_body(text, re.compile(
        rf"^(?P<level>#{2,6})\s*{re.escape(section_heading)}\b",
        re.MULTILINE | re.IGNORECASE,
    ))
    if scoped is None:
        return []

    requirements: list[tuple[str, str, str]] = []
    for match in REQUIREMENT_HEADING.finditer(scoped):
        level = len(match.group("level"))
        start = match.end()
        end = len(scoped)
        for heading in ANY_HEADING.finditer(scoped, start):
            if len(heading.group("level")) <= level:
                end = heading.start()
                break
        requirements.append(
            (match.group("id"), match.group("title").strip(), scoped[start:end])
        )
    return requirements


def validate_requirement_block(
    report: Report,
    requirements: list[tuple[str, str, str]],
    label: str,
) -> None:
    if not requirements:
        report.warn(f"{label}: no requirement headings found")
        return

    report.ok(f"{label}: {len(requirements)} requirement(s) with well-formed IDs")
    seen: set[str] = set()
    for requirement_id, title, body in requirements:
        if requirement_id in seen:
            report.error(f"{label} {requirement_id}: duplicate requirement ID")
        seen.add(requirement_id)

        if not title:
            report.error(f"{label} {requirement_id}: heading has no title")

        criteria = acceptance_lines(body)
        if not criteria:
            report.error(f"{label} {requirement_id}: no acceptance criteria found")
            continue

        for item in criteria:
            excerpt = item if len(item) <= 70 else f"{item[:67]}..."
            if AMBIGUOUS_TERMS.search(item):
                report.warn(
                    f"{label} {requirement_id}: ambiguous acceptance criterion "
                    f"(prefer concrete, testable language): '{excerpt}'"
                )
            if not NORMATIVE_VERB.search(item):
                report.error(
                    f"{label} {requirement_id}: criterion is not testable, it states no "
                    f"required outcome (add SHALL or MUST): '{excerpt}'"
                )
                continue
            if not EARS_LEAD.search(item):
                report.warn(
                    f"{label} {requirement_id}: criterion has SHALL/MUST but no trigger "
                    f"(WHEN/IF ... THEN ...): '{excerpt}'"
                )


def validate_removed_section(report: Report, text: str) -> None:
    scoped = section_body(text, re.compile(
        r"^(?P<level>#{2,6})\s*REMOVED Requirements\b",
        re.MULTILINE | re.IGNORECASE,
    ))
    if scoped is None:
        report.error("delta spec missing ## REMOVED Requirements (use '- none' when nothing removed)")
        return

    ids = [match.group("id") for match in REMOVED_ID.finditer(scoped)]
    if not ids and re.search(r"\bnone\b", scoped, re.IGNORECASE):
        report.ok("REMOVED Requirements: none")
        return

    if not ids:
        report.error("REMOVED Requirements: list requirement IDs to retire, or '- none'")
        return

    report.ok(f"REMOVED Requirements: {len(ids)} requirement ID(s) listed")


def _split_criterion_label(cleaned: str) -> str | None:
    """Return the criterion text after an Acceptance Criteria / AC label.

    List markers are already stripped. Split on a colon, en-dash, em-dash, or a
    space-hyphen-space so `- **Acceptance Criteria** - WHEN ...` still works
    without treating the leading `-` of a bullet as a separator.
    """

    remainder = re.split(r"[:\u2013\u2014]|\s+-\s+", cleaned, maxsplit=1)
    if len(remainder) == 2 and remainder[1].strip():
        return remainder[1].strip()
    return None


def acceptance_lines(body: str) -> list[str]:
    """Collect candidate acceptance-criteria lines from a requirement body."""

    lines: list[str] = []
    in_labeled_block = False
    in_fence = False

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or not line:
            continue

        # Markdown tables are documentation, not criteria.
        if line.startswith("|"):
            continue

        if ACCEPTANCE_LABEL.search(line):
            in_labeled_block = True
            cleaned = line.lstrip("-* ").strip()
            remainder = _split_criterion_label(cleaned)
            if remainder:
                lines.append(remainder)
            continue

        if line.startswith(("-", "*")) or re.match(r"^\d+\.", line):
            cleaned = line.lstrip("-* ").strip()
            if cleaned and not cleaned.startswith("---"):
                if METADATA_KEY.match(cleaned):
                    continue
                lines.append(cleaned)
                continue

        if in_labeled_block and not line.startswith("#"):
            lines.append(line)

    return lines


def validate_out_of_scope(report: Report, text: str) -> None:
    body = section_body(text, OUT_OF_SCOPE_HEADING)
    if body is None:
        return

    stripped = body.strip()
    if not stripped or re.fullmatch(r"-\s*(none|n/a)\s*", stripped, re.IGNORECASE):
        report.warn(
            "Out of Scope section is empty or 'none' — explicit scope boundaries are recommended"
        )
        return

    report.ok("Out of Scope section documents explicit boundaries")


def build_report(target: str, text: str) -> Report:
    report = Report(gate=GATE, target=target)
    visible = visible_markdown(text)
    delta = is_delta_spec(text)

    if not has_section(visible, "Goal"):
        report.error("missing required section: ## Goal")

    if has_section(visible, "Assumptions"):
        report.ok("section present: Assumptions")
    else:
        report.error("missing required section: ## Assumptions")

    if delta:
        report.ok("delta spec detected (ADDED/MODIFIED/REMOVED)")
        if not has_section(visible, "Out of Scope"):
            report.warn("delta spec: ## Out of Scope recommended")

        for heading, label in DELTA_SECTIONS:
            if has_section(visible, heading):
                report.ok(f"section present: {heading}")
            elif label != "removed":
                report.warn(f"delta spec: ## {heading} not present")

        validate_requirement_block(
            report,
            split_delta_requirements(visible, "ADDED Requirements"),
            "ADDED",
        )
        validate_requirement_block(
            report,
            split_delta_requirements(visible, "MODIFIED Requirements"),
            "MODIFIED",
        )
        validate_removed_section(report, visible)
        validate_out_of_scope(report, visible)
    else:
        for section in REQUIRED_SECTIONS:
            if has_section(visible, section):
                report.ok(f"section present: {section}")
            else:
                report.error(f"missing required section: ## {section}")

        requirements = split_requirements(visible)

        if not requirements:
            report.error(
                "no requirement headings found - use '### REQ-001: Title' (prefix-NNN)"
            )
        else:
            validate_requirement_block(report, requirements, "Requirements")

        validate_out_of_scope(report, visible)

    for malformed in MALFORMED_ID.finditer(visible):
        raw = malformed.group(0).lstrip("# ").strip()
        if not REQUIREMENT_HEADING.match(f"### {raw}"):
            report.error(f"malformed requirement ID: '{raw}' - expected REQ-001 style")

    placeholders = find_placeholders(text)
    if placeholders:
        for item in placeholders[:10]:
            report.error(f"unresolved placeholder at {item}")
    else:
        report.ok("no unresolved placeholders")

    clarifications = CLARIFICATION.findall(visible)
    if clarifications:
        report.warn(
            f"{len(clarifications)} open [NEEDS CLARIFICATION] marker(s) — resolve before approval"
        )
    else:
        report.ok("no open [NEEDS CLARIFICATION] markers")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a feature spec.md")
    parser.add_argument(
        "spec",
        nargs="?",
        help="feature name, feature directory, or path to spec.md",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as blocking failures",
    )
    args = parser.parse_args(argv)

    path, text = resolve_artifact(args.spec, "spec.md", GATE)
    report = build_report(str(path), text)
    return report.emit(strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
