#!/usr/bin/env python3
"""Completion gate for a feature directory under `.specs/features/`.

Run before declaring a feature done:

    python3 validate_state.py .specs/features/auth
    python3 validate_state.py auth
    python3 validate_state.py            # when the project has a single feature

Checks:
  * spec.md exists
  * validation.md exists and was written by the independent verifier
  * the verdict is filled and reads PASS (preamble or ## Verdict heading only)
  * the report cites file:line evidence (evidence-or-zero)
  * every spec requirement ID has test evidence on the same coverage line
  * the discrimination sensor result is recorded (blocking on Medium+ features)
  * PASS with a surviving mutant fails; Medium+ PASS requires at least one kill
  * PASS with open Gaps or a failing Security Review result fails
  * open task checkboxes in tasks.md block completion

Exit codes: 0 pass, 1 blocking issues, 2 usage error.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from _common import (
    Report,
    find_placeholders,
    mask_fenced_blocks,
    requirement_ids,
    resolve_feature_dir,
    section_body,
    visible_markdown,
)

GATE = "validate-state"

VERDICT = re.compile(
    r"^\s*[-*]?\s*\*{0,2}(?:verdict|result|status)\*{0,2}\s*:\s*\*{0,2}(?P<value>[A-Za-z ]+)",
    re.IGNORECASE | re.MULTILINE,
)
VERDICT_HEADING = re.compile(
    r"^#{1,6}\s*(?:verdict|result|status)\s*$\s*\n+\s*\*{0,2}(?P<value>[A-Za-z ]+)",
    re.IGNORECASE | re.MULTILINE,
)
SECTION_START = re.compile(r"^#{2,6}\s", re.MULTILINE)
EVIDENCE = re.compile(r"[\w./\\-]+\.[A-Za-z][A-Za-z0-9]{0,9}:\d{1,6}\b")
URL = re.compile(r"\b[a-z][a-z0-9+.-]*://\S+", re.IGNORECASE)
SENSOR = re.compile(r"(discrimination sensor|mutant)", re.IGNORECASE)
# Outcome words only — the section title "Discrimination Sensor" must not count.
SENSOR_RESULT = re.compile(r"\b(killed|survived|injected)\b", re.IGNORECASE)
SENSOR_KILLED = re.compile(r"\bkilled\b", re.IGNORECASE)
SENSOR_SURVIVED = re.compile(r"\bsurvived\b", re.IGNORECASE)
SENSOR_SECTION = re.compile(
    r"^(?P<level>#{2,6})\s*(?:Discrimination Sensor|Mutants?)\b",
    re.MULTILINE | re.IGNORECASE,
)
GAPS_SECTION = re.compile(
    r"^(?P<level>#{2,6})\s*Gaps?\b",
    re.MULTILINE | re.IGNORECASE,
)
SECURITY_SECTION = re.compile(
    r"^(?P<level>#{2,6})\s*Security Review\b",
    re.MULTILINE | re.IGNORECASE,
)
SECURITY_FAIL = re.compile(
    r"^\s*[-*]?\s*\*{0,2}Result\*{0,2}\s*:\s*\*{0,2}(?P<value>fail|failed|failing)\b",
    re.IGNORECASE | re.MULTILINE,
)
SECTION_HEADING = re.compile(r"^(?P<level>#{1,6})\s", re.MULTILINE)
OPEN_TASK = re.compile(r"^\s*[-*]\s*\[ \]\s+(?P<label>.+)$", re.MULTILINE)
TASK_HEADING = re.compile(
    r"^#{2,6}\s*T\d{1,6}\b", re.MULTILINE | re.IGNORECASE
)
PHASE_HEADING = re.compile(
    r"^#{1,6}\s*Phase\s+\d+\b", re.MULTILINE | re.IGNORECASE
)
REQUIREMENT_REF = re.compile(r"\b[A-Z][A-Z0-9]{1,9}-\d{2,4}\b")
# evidence-or-zero requires a test path, not an arbitrary file:line such as config.yaml:12
TEST_EVIDENCE = re.compile(
    r"(?:^|/)(?:tests?|__tests__|spec)(?:/|$)|[._-](?:test|spec)\.|test_[^/]+\.",
    re.IGNORECASE,
)
PASS_VERDICTS = {"PASS", "PASSED"}
FAIL_VERDICTS = {"FAIL", "FAILED"}
MEDIUM_TASK_FLOOR = 4
VERIFIER_MODE = re.compile(
    r"^\s*[-*]?\s*\*{0,2}Verifier[- ]Mode\*{0,2}\s*:\s*(?P<value>[^\n]+)",
    re.IGNORECASE | re.MULTILINE,
)
VALID_VERIFIER_MODES = frozenset({"fresh_chat", "subagent", "same_session"})


def validation_preamble(text: str) -> str:
    """Return the text before the first `##` section (fences already ignored)."""

    visible = visible_markdown(text)
    match = SECTION_START.search(visible)
    if not match:
        return visible
    return visible[: match.start()]


def find_verifier_mode(text: str) -> str | None:
    preamble = validation_preamble(text)
    match = VERIFIER_MODE.search(preamble)
    if not match:
        return None
    return re.sub(r"\s+", "_", match.group("value").strip().lower())


def validate_verifier_mode(report: Report, validation: str, medium_plus: bool) -> None:
    mode = find_verifier_mode(validation)
    if not mode:
        report.warn(
            "Verifier-Mode not recorded — add "
            "'Verifier-Mode: fresh_chat | subagent | same_session' to the preamble"
        )
        return

    if mode not in VALID_VERIFIER_MODES:
        report.warn(
            f"unknown Verifier-Mode '{mode}' — use fresh_chat, subagent, or same_session"
        )
        return

    if mode == "same_session" and medium_plus:
        report.warn(
            "Verifier-Mode is same_session on Medium+ feature — "
            "prefer subagent or fresh_chat for independent verify"
        )
    else:
        report.ok(f"Verifier-Mode recorded: {mode}")


def find_verdict(text: str) -> re.Match[str] | None:
    """Accept Verdict only in the preamble or as a dedicated ## Verdict heading."""

    preamble = validation_preamble(text)
    return VERDICT.search(preamble) or VERDICT_HEADING.search(visible_markdown(text))


def verdict_conflict(text: str) -> tuple[str, str] | None:
    """Return (preamble, heading) values when both exist and disagree."""

    preamble = validation_preamble(text)
    preamble_match = VERDICT.search(preamble)
    heading_match = VERDICT_HEADING.search(visible_markdown(text))
    if not preamble_match or not heading_match:
        return None

    left = re.sub(r"\s+", " ", preamble_match.group("value").strip().upper())
    right = re.sub(r"\s+", " ", heading_match.group("value").strip().upper())
    if left == right:
        return None
    return left, right


def sensor_focus(text: str) -> str:
    """Text where mutant outcomes must appear: sensor sections and mutant lines."""

    visible = visible_markdown(text)
    chunks: list[str] = []

    for match in SENSOR_SECTION.finditer(visible):
        level = len(match.group("level"))
        start = match.end()
        end = len(visible)
        for heading in SECTION_HEADING.finditer(visible, start):
            if len(heading.group("level")) <= level:
                end = heading.start()
                break
        chunks.append(visible[match.start() : end])

    for line in visible.splitlines():
        if SENSOR.search(line):
            chunks.append(line)

    return "\n".join(chunks)


def find_evidence(text: str) -> list[str]:
    """Return test file:line references, ignoring fences, comments, URLs, and ports."""

    visible = visible_markdown(text)
    hits = EVIDENCE.findall(URL.sub(" ", visible))
    return [hit for hit in hits if TEST_EVIDENCE.search(hit.replace("\\", "/"))]


def open_gap_lines(text: str) -> list[str]:
    """Return non-empty Gaps bullets that are not an explicit none placeholder."""

    body = section_body(visible_markdown(text), GAPS_SECTION)
    if body is None:
        return []
    gaps: list[str] = []
    none_values = {
        "none",
        "n/a",
        "na",
        "-",
        "—",
        "–",
        "no gaps",
    }
    for raw in body.splitlines():
        line = raw.strip()
        marker = re.match(r"^[-*]\s+(.*)$", line)
        if not marker:
            continue
        # Do not use lstrip("-* ") — it eats emphasis markers on `**none**`.
        cleaned = marker.group(1).strip().strip("`")
        while len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in "*_":
            cleaned = cleaned[1:-1].strip()
        if not cleaned or cleaned.lower() in none_values:
            continue
        gaps.append(cleaned)
    return gaps


def security_blocks_pass(text: str) -> bool:
    """True when Security Review explicitly records a failing result."""

    body = section_body(visible_markdown(text), SECURITY_SECTION)
    if body is None:
        return False
    return bool(SECURITY_FAIL.search(body))


def is_medium_plus(feature_dir: Path) -> bool:
    """Medium+ when a non-empty design exists, tasks are substantial, or work is phased."""

    design_path = feature_dir / "design.md"
    if design_path.is_file() and design_path.read_text(encoding="utf-8").strip():
        return True

    tasks_path = feature_dir / "tasks.md"
    if not tasks_path.is_file():
        return False

    tasks = mask_fenced_blocks(tasks_path.read_text(encoding="utf-8"))
    task_count = len(TASK_HEADING.findall(tasks))
    phase_count = len(PHASE_HEADING.findall(tasks))
    return task_count >= MEDIUM_TASK_FLOOR or phase_count >= 2


def requirement_evidence_gaps(spec_text: str, validation: str) -> list[str]:
    """Return requirement IDs that lack a same-line test evidence citation."""

    missing: list[str] = []
    visible = visible_markdown(validation)
    for requirement_id in requirement_ids(visible_markdown(spec_text)):
        covered = False
        for line in visible.splitlines():
            if requirement_id not in line:
                continue
            if find_evidence(line):
                covered = True
                break
        if not covered:
            missing.append(requirement_id)
    return missing


def build_report(feature_dir: Path) -> Report:
    report = Report(gate=GATE, target=str(feature_dir))

    spec_path = feature_dir / "spec.md"
    spec_text = ""
    if spec_path.exists() and spec_path.read_text(encoding="utf-8").strip():
        report.ok("spec.md present")
        spec_text = spec_path.read_text(encoding="utf-8")
    else:
        report.error("spec.md missing or empty - a feature cannot close without a spec")

    validation_path = feature_dir / "validation.md"
    if not validation_path.exists():
        report.error(
            "validation.md missing - run /verify with an independent verifier "
            "before closing the feature"
        )
        return report

    validation = validation_path.read_text(encoding="utf-8")
    if not validation.strip():
        report.error("validation.md is empty")
        return report

    verdict: str | None = None
    conflict = verdict_conflict(validation)
    if conflict:
        left, right = conflict
        report.error(
            f"conflicting verdicts: preamble says '{left}' but ## Verdict says '{right}'"
        )

    verdict_match = find_verdict(validation)
    if not verdict_match:
        report.error(
            "validation.md has no verdict - add 'Verdict: PASS' in the preamble "
            "(before ## sections) or a '## Verdict' heading"
        )
    else:
        verdict = re.sub(r"\s+", " ", verdict_match.group("value").strip().upper())
        if verdict in PASS_VERDICTS:
            report.ok("verifier verdict is PASS")
        elif verdict in FAIL_VERDICTS:
            report.error("verifier verdict is FAIL - resolve gaps and re-verify")
        else:
            report.error(
                f"verifier verdict is not PASS: '{verdict}' - "
                "write PASS only with no remaining gaps"
            )

    evidence = find_evidence(validation)
    if evidence:
        report.ok(f"{len(evidence)} file:line evidence reference(s)")
    else:
        report.error(
            "no file:line evidence found - evidence-or-zero requires test references "
            "such as test/auth/token.test.ts:41 (a URL is not evidence)"
        )

    if spec_text.strip():
        gaps = requirement_evidence_gaps(spec_text, validation)
        if gaps:
            for requirement_id in gaps:
                report.error(
                    f"{requirement_id} has no test file:line on the same coverage line"
                )
        else:
            report.ok("every spec requirement has test evidence")

    focus = sensor_focus(validation)
    if verdict in PASS_VERDICTS and SENSOR_SURVIVED.search(focus):
        report.error(
            "verdict is PASS but a mutant survived - kill every mutant before closing"
        )

    medium_plus = is_medium_plus(feature_dir)
    validate_verifier_mode(report, validation, medium_plus)

    has_sensor = bool(SENSOR.search(validation) and SENSOR_RESULT.search(focus))
    if has_sensor:
        if (
            medium_plus
            and verdict in PASS_VERDICTS
            and not SENSOR_KILLED.search(focus)
        ):
            report.error(
                "Medium+ PASS requires at least one killed mutant "
                "(injected alone is not enough to close)"
            )
        else:
            report.ok("discrimination sensor result recorded")
    elif medium_plus:
        report.error(
            "Medium+ feature requires a discrimination sensor result "
            "(mutant injected/killed/survived) before closing"
        )
    else:
        report.warn(
            "no discrimination sensor section found - confirm mutants were injected"
        )

    if verdict in PASS_VERDICTS:
        for gap in open_gap_lines(validation)[:10]:
            report.error(
                f"verdict is PASS but Gaps still lists '{gap}' - "
                "resolve gaps or write FAIL"
            )
        if security_blocks_pass(validation):
            report.error(
                "verdict is PASS but Security Review result is fail - "
                "resolve findings or write FAIL"
            )

    tasks_path = feature_dir / "tasks.md"
    if tasks_path.exists():
        open_tasks = OPEN_TASK.findall(
            mask_fenced_blocks(tasks_path.read_text(encoding="utf-8"))
        )
        if open_tasks:
            for label in open_tasks[:10]:
                report.error(f"open task remains: {label.strip()}")
        else:
            report.ok("all tasks are checked off")

    placeholders = find_placeholders(validation)
    if placeholders:
        for item in placeholders[:10]:
            report.error(f"unresolved placeholder in validation.md at {item}")

    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate that a feature is ready to be declared done"
    )
    parser.add_argument(
        "feature",
        nargs="?",
        help="feature name or path to .specs/features/[feature]",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as blocking failures",
    )
    args = parser.parse_args(argv)

    feature_dir = resolve_feature_dir(args.feature, GATE)
    report = build_report(feature_dir)
    return report.emit(strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
