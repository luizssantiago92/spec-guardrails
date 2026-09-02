"""Tests for req_analysis_diff.py."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import req_analysis_diff  # noqa: E402


BRIEF = """# Brief

## Capabilities

- Users can reset password via email link

## Owner approval

- Approved: yes
- Date: 2026-01-01
"""

SPEC_OK = """# Spec

## Requirements

### REQ-001: Password reset

- Acceptance Criteria: The system SHALL send a reset email WHEN a valid user requests reset THEN return 202.

## Assumptions

- SMTP configured

## Out of Scope

- none
"""

SPEC_GAP = """# Spec

## Requirements

### REQ-001: Login page

- Acceptance Criteria: The system SHALL render login WHEN user visits /login THEN show form.

## Assumptions

- none

## Out of Scope

- none
"""


class ReqAnalysisDiffTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_maps_capability_to_spec(self) -> None:
        brief = self.root / "brief.md"
        spec = self.root / "spec.md"
        brief.write_text(BRIEF, encoding="utf-8")
        spec.write_text(SPEC_OK, encoding="utf-8")
        report = req_analysis_diff.build_report(brief, spec)
        self.assertTrue(report.passed)

    def test_flags_uncovered_capability(self) -> None:
        brief = self.root / "brief.md"
        spec = self.root / "spec.md"
        brief.write_text(BRIEF, encoding="utf-8")
        spec.write_text(SPEC_GAP, encoding="utf-8")
        report = req_analysis_diff.build_report(brief, spec)
        self.assertFalse(report.passed)


if __name__ == "__main__":
    unittest.main()
