"""Tests for episodic memory lifecycle and code index."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

import code_index  # noqa: E402
import episodes  # noqa: E402
import memory_index  # noqa: E402


class EpisodesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.previous = Path.cwd()
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.specs = self.root / ".specs"
        self.specs.mkdir(parents=True)
        (self.specs / "STATE.md").write_text(
            "\n".join(["# State", "", "- Feature: 001-auth", "- Phase: Execute"]),
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        os.chdir(self.previous)
        self.temp.cleanup()

    def test_record_archive_and_index(self) -> None:
        os.chdir(self.root)
        self.assertEqual(
            episodes.main(["record", "--summary", "Fixed OAuth redirect loop"]),
            0,
        )
        self.assertEqual(episodes.main(["archive", "EP-001"]), 0)
        self.assertEqual(memory_index.main(["rebuild"]), 0)
        self.assertEqual(episodes.main(["list", "--status", "episodic"]), 0)


class CodeIndexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.previous = Path.cwd()
        src = self.root / "src"
        src.mkdir(parents=True)
        (src / "auth.ts").write_text(
            "export function loginUser() {}\nimport { db } from './db';\n",
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        os.chdir(self.previous)
        self.temp.cleanup()

    def test_rebuild_and_search(self) -> None:
        os.chdir(self.root)
        self.assertEqual(code_index.main(["rebuild", "--roots", "src"]), 0)
        self.assertEqual(code_index.main(["search", "loginUser"]), 0)


if __name__ == "__main__":
    unittest.main()
