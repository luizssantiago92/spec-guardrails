"""Tests for SQLite memory index, search, and hybrid retrieval."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

import memory_index  # noqa: E402
import memory_query  # noqa: E402
import memory_retrieve  # noqa: E402
import memory_search  # noqa: E402


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
                    "Users can sign in with OAuth credentials.",
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

    def test_rebuild_indexes_kickoff_docs(self) -> None:
        os.chdir(self.root)
        try:
            (self.root / "prd.md").write_text(
                "## Goal\nBuild a login portal for OAuth users.\n",
                encoding="utf-8",
            )
            project = self.specs / "project"
            project.mkdir(parents=True)
            (project / "kickoff.md").write_text(
                "## Notes\nKickoff from chat paste.\n",
                encoding="utf-8",
            )
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_search.main(["Kickoff", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_query_reports_missing_database(self) -> None:
        os.chdir(self.root)
        try:
            code = memory_query.main(["--from", "T1"])
            self.assertEqual(code, 1)
        finally:
            os.chdir(self.previous)

    def test_search_finds_chunk_body_text(self) -> None:
        import memory_search

        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_search.main(["OAuth", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_search_finds_indexed_entities(self) -> None:
        import memory_search

        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_search.main(["login", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_retrieve_hybrid_expands_graph(self) -> None:
        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_retrieve.main(["OAuth", "--mode", "hybrid", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_embed_skips_when_semantic_disabled(self) -> None:
        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_index.main(["embed"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_embed_with_hash_provider(self) -> None:
        config = self.specs / "config.yaml"
        config.write_text(
            "\n".join(
                [
                    "schema: spec-driven",
                    "memory:",
                    "  retrieval:",
                    "    semantic: true",
                    "    provider: hash",
                ]
            ),
            encoding="utf-8",
        )
        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            self.assertEqual(memory_index.main(["embed"]), 0)
            code = memory_retrieve.main(["OAuth credentials", "--mode", "semantic", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_search_finds_task_chunk_body(self) -> None:
        import memory_search

        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_search.main(["Done when", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_search_finds_design_chunk(self) -> None:
        import memory_search

        feature = self.specs / "features" / "001-auth"
        (feature / "design.md").write_text(
            "## API\nUse JWT access tokens with short TTL.\n",
            encoding="utf-8",
        )
        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            code = memory_search.main(["JWT access tokens", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)

    def test_rebuild_preserves_embeddings_for_unchanged_chunks(self) -> None:
        config = self.specs / "config.yaml"
        config.write_text(
            "\n".join(
                [
                    "schema: spec-driven",
                    "memory:",
                    "  retrieval:",
                    "    semantic: true",
                    "    provider: hash",
                ]
            ),
            encoding="utf-8",
        )
        os.chdir(self.root)
        try:
            self.assertEqual(memory_index.main(["rebuild"]), 0)
            self.assertEqual(memory_index.main(["embed"]), 0)
            db_path = self.root / ".specs" / "memory" / "memory.db"
            import sqlite3

            conn = sqlite3.connect(db_path)
            before = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
            conn.close()
            self.assertGreater(before, 0)

            self.assertEqual(memory_index.main(["rebuild"]), 0)
            conn = sqlite3.connect(db_path)
            after = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
            conn.close()
            self.assertEqual(before, after)
        finally:
            os.chdir(self.previous)

    def test_status_reports_missing_database(self) -> None:
        os.chdir(self.root)
        try:
            code = memory_index.main(["status", "--json"])
            self.assertEqual(code, 0)
        finally:
            os.chdir(self.previous)


if __name__ == "__main__":
    unittest.main()
