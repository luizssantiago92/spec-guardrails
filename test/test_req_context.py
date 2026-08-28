"""Tests for req_context.py helper."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import req_context  # noqa: E402


class ReqContextTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self._tmpdir.name)
        project = self.root / ".specs" / "project"
        project.mkdir(parents=True)
        (project / "requirements-brief.md").write_text(
            "# Requirements brief\n\n## Goal\n\nTest goal\n",
            encoding="utf-8",
        )
        (self.root / "prd.md").write_text("# PRD\n", encoding="utf-8")

    def tearDown(self) -> None:
        self._tmpdir.cleanup()

    def test_discovers_kickoff_sources(self) -> None:
        sources = req_context.discover_sources(self.root)
        prd = next(entry for entry in sources if entry["path"] == "prd.md")
        self.assertTrue(prd["exists"])

    def test_builds_project_context(self) -> None:
        ctx = req_context.build_context(self.root, "project", None)
        self.assertEqual(ctx["scope"], "project")
        self.assertEqual(ctx["brief_path"], ".specs/project/requirements-brief.md")
        self.assertIn("Test goal", ctx.get("brief_excerpt", ""))


if __name__ == "__main__":
    unittest.main()
