"""Tests for validate_design.py gate."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import validate_design  # noqa: E402


class ValidateDesignTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.feature = self.root / ".specs" / "features" / "003-auth"
        self.feature.mkdir(parents=True)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_skips_when_design_absent(self) -> None:
        report = validate_design.build_report(self.feature)
        self.assertTrue(report.passed)

    def test_requires_sections_when_design_present(self) -> None:
        (self.feature / "context.md").write_text("# Context\n", encoding="utf-8")
        (self.feature / "design.md").write_text(
            "# Design\n\n## Context\nAuth boundaries.\n",
            encoding="utf-8",
        )
        report = validate_design.build_report(self.feature)
        self.assertFalse(report.passed)
        self.assertTrue(any("Decision" in err for err in report.errors))


if __name__ == "__main__":
    unittest.main()
