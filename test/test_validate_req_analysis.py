"""Tests for validate_req_analysis.py gate."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_req_analysis  # noqa: E402


APPROVED_BRIEF = """# Requirements brief: Settings page

## Goal

Let users change profile settings from a dedicated page.

## Context sources

- prd.md §Settings
- kickoff chat 2026-08-27

## Current state

- No settings route yet

## Capabilities

- View and edit display name

## Interaction details

- n/a

## Constraints & out of scope

- Out of scope: billing

## Resolved questions

### D-001: Save behavior

- **Decision**: auto-save on blur
- **Date**: 2026-08-27

## Open questions

- none

## Owner approval

- Approved: yes
- Date: 2026-08-27
"""


class ValidateReqAnalysisTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self._tmpdir.name)
        self.brief_dir = self.root / ".specs" / "project"
        self.brief_dir.mkdir(parents=True)
        self.brief_path = self.brief_dir / "requirements-brief.md"

    def tearDown(self) -> None:
        self._tmpdir.cleanup()

    def test_passes_approved_brief(self) -> None:
        self.brief_path.write_text(APPROVED_BRIEF, encoding="utf-8")
        report = validate_req_analysis.build_report(self.brief_path)
        self.assertTrue(report.passed)

    def test_blocks_open_questions(self) -> None:
        text = APPROVED_BRIEF.replace("- none", "- What theme color?")
        self.brief_path.write_text(text, encoding="utf-8")
        report = validate_req_analysis.build_report(self.brief_path)
        self.assertFalse(report.passed)

    def test_blocks_missing_approval(self) -> None:
        text = APPROVED_BRIEF.replace("Approved: yes", "Approved: pending")
        self.brief_path.write_text(text, encoding="utf-8")
        report = validate_req_analysis.build_report(self.brief_path)
        self.assertFalse(report.passed)

    def test_blocks_clarification_marker(self) -> None:
        text = APPROVED_BRIEF + "\n\nStill [NEEDS CLARIFICATION] on layout.\n"
        self.brief_path.write_text(text, encoding="utf-8")
        report = validate_req_analysis.build_report(self.brief_path)
        self.assertFalse(report.passed)

    def test_resolve_default_project_brief(self) -> None:
        self.brief_path.write_text(APPROVED_BRIEF, encoding="utf-8")
        resolved = validate_req_analysis.resolve_brief_path(None, root=self.root)
        self.assertEqual(resolved, self.brief_path)


if __name__ == "__main__":
    unittest.main()
