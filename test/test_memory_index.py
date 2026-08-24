"""Tests for SQLite memory index and knowledge-graph query."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

import memory_index  # noqa: E402
import memory_query  # noqa: E402


class MemoryIndexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.previous = Path.cwd()
        self.specs = self.root / ".specs"
        feature = self.specs / "features" / "001-auth"
        feature.mkdir(parents=True)
        (feature / "spec.md").write_text(
            "\n".join(
                [
                    "## Requirements",
                    "### REQ-001: Login",
                    "Users can sign in.",
                    "## Assumptions",
                    "- OAuth provider exists",
                    "## Out of Scope",
                    "- password reset",
                ]
            ),
            encoding="utf-8",
        )
        (feature / "tasks.md").write_text(
            "\n".join(
                [
                    "### T1: Add login route",
                    "- Requirement: REQ-001",
                    "- Files: src/auth.ts",
                    "- Depends on: none",
                    "- Tests: tests/auth.test.ts",
                    "- Gate: npm test",
                    "- Done when: route returns 200",
                ]
            ),
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_rebuild_indexes_entities_and_relations(self) -> None:
        import os

        os.chdir(self.root)
        try:
            code = memory_index.main(["rebuild"])
            self.assertEqual(code, 0)
            db_path = self.root / ".specs" / "memory" / "memory.db"
            self.assertTrue(db_path.is_file())

            code = memory_query.main(["--from", "T1", "--depth", "1", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_query_reports_missing_database(self) -> None:
        import os

        os.chdir(self.root)
        try:
            code = memory_query.main(["--from", "T1"])
            self.assertEqual(code, 1)
        finally:
            os.chdir(self.previous)


if __name__ == "__main__":
    unittest.main()
