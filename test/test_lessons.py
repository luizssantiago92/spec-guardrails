"""Unit tests for the lessons engine.

Run from the repository root:

    python3 -m unittest discover -s test -p 'test_*.py'
"""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from datetime import date, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import lessons  # noqa: E402

VALIDATION = """# Validation: Authentication

- Verdict: FAIL
- REQ-001 - test/routes/login.test.ts:24
"""


@contextmanager
def _chdir(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


def _run(argv):
    buf = io.StringIO()
    err = io.StringIO()
    with redirect_stdout(buf), redirect_stderr(err):
        try:
            code = lessons.main(argv)
        except SystemExit as exc:
            return exc.code, buf.getvalue() + err.getvalue()
    return code, buf.getvalue() + err.getvalue()


class LessonsEngineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.auth = self.root / ".specs" / "features" / "auth"
        self.billing = self.root / ".specs" / "features" / "billing"
        self.auth.mkdir(parents=True)
        self.billing.mkdir(parents=True)
        (self.auth / "validation.md").write_text(VALIDATION, encoding="utf-8")
        (self.billing / "validation.md").write_text(VALIDATION, encoding="utf-8")
        self.cwd = _chdir(self.root)
        self.cwd.__enter__()

    def tearDown(self):
        self.cwd.__exit__(None, None, None)
        self.tmp.cleanup()

    def _add(self, feature="auth", **kwargs):
        source = kwargs.pop(
            "source", f".specs/features/{feature}/validation.md"
        )
        argv = [
            "add",
            "--title",
            kwargs.pop("title", "Assert error codes, not just status"),
            "--rule",
            kwargs.pop(
                "rule",
                "Acceptance criteria must name the error code and tests must assert it",
            ),
            "--source",
            source,
            "--trigger",
            kwargs.pop("trigger", "mutant returning 403 instead of 401 survived"),
        ]
        if "feature_flag" in kwargs:
            argv.extend(["--feature", kwargs.pop("feature_flag")])
        return _run(argv)

    def test_add_without_source_is_usage_error(self):
        code, output = _run(
            ["add", "--title", "x", "--rule", "y"]
        )
        self.assertEqual(code, 2)
        self.assertIn("--source", output)

    def test_add_requires_validation_md(self):
        spec = self.auth / "spec.md"
        spec.write_text("# Spec\n", encoding="utf-8")
        code, output = self._add(source=str(spec))
        self.assertEqual(code, 1)
        self.assertIn("validation.md", output)

    def test_add_stores_a_candidate(self):
        code, output = self._add()
        self.assertEqual(code, 0, output)
        self.assertIn("L-001", output)
        self.assertIn("candidate", output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        self.assertEqual(store["lessons"][0]["status"], "candidate")
        markdown = (self.root / ".specs" / "LESSONS.md").read_text()
        self.assertIn("none yet", markdown)
        self.assertNotIn("L-001", markdown)

    def test_near_duplicate_is_deduped(self):
        self._add()
        code, output = self._add(
            title="assert error codes not just status!",
            rule="acceptance criteria must name the error code and tests must assert it.",
        )
        self.assertEqual(code, 0, output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        self.assertEqual(len(store["lessons"]), 1)

    def test_accented_duplicate_is_deduped(self):
        self._add(title="Não invente APIs", rule="Follow the knowledge chain")
        code, output = self._add(
            title="Nao invente APIs", rule="Follow the knowledge chain"
        )
        self.assertEqual(code, 0, output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        self.assertEqual(len(store["lessons"]), 1)

    def test_same_feature_recurrence_does_not_promote(self):
        self._add()
        code, output = self._add()
        self.assertEqual(code, 0, output)
        self.assertIn("does not promote", output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        self.assertEqual(store["lessons"][0]["status"], "candidate")
        self.assertEqual(store["lessons"][0]["features"], ["auth"])

    def test_second_feature_promotes_to_approved(self):
        self._add("auth")
        code, output = self._add("billing")
        self.assertEqual(code, 0, output)
        self.assertIn("approved", output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        lesson = store["lessons"][0]
        self.assertEqual(lesson["status"], "approved")
        self.assertEqual(set(lesson["features"]), {"auth", "billing"})
        markdown = (self.root / ".specs" / "LESSONS.md").read_text()
        self.assertIn("L-001", markdown)
        self.assertIn("L-001", markdown)

    def test_source_line_suffix_is_accepted(self):
        code, output = self._add(
            source=".specs/features/auth/validation.md:24"
        )
        self.assertEqual(code, 0, output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        self.assertEqual(
            store["lessons"][0]["source"],
            ".specs/features/auth/validation.md:24",
        )

    def test_list_defaults_to_approved(self):
        code, output = _run(["list"])
        self.assertEqual(code, 0)
        self.assertIn("0 approved", output)
        self._add("auth")
        self._add("billing")
        code, output = _run(["list"])
        self.assertEqual(code, 0)
        self.assertIn("1 approved", output)
        self.assertIn("L-001", output)

    def test_penalize_twice_quarantines(self):
        self._add("auth")
        self._add("billing")
        code, output = _run(
            [
                "penalize",
                "--id",
                "L-001",
                "--source",
                ".specs/features/auth/validation.md",
            ]
        )
        self.assertEqual(code, 0, output)
        code, output = _run(
            [
                "penalize",
                "--id",
                "L-001",
                "--source",
                ".specs/features/auth/validation.md",
            ]
        )
        self.assertEqual(code, 0, output)
        self.assertIn("quarantined", output)
        store = json.loads((self.root / ".specs" / "lessons.json").read_text())
        self.assertEqual(store["lessons"][0]["status"], "quarantined")
        markdown = (self.root / ".specs" / "LESSONS.md").read_text()
        self.assertNotIn("L-001", markdown)

    def test_penalize_rejects_candidates(self):
        self._add()
        code, output = _run(
            [
                "penalize",
                "--id",
                "L-001",
                "--source",
                ".specs/features/auth/validation.md",
            ]
        )
        self.assertEqual(code, 1)
        self.assertIn("candidate", output)

    def test_corrupt_json_is_a_failure(self):
        store = self.root / ".specs" / "lessons.json"
        store.parent.mkdir(parents=True, exist_ok=True)
        store.write_text("{not json", encoding="utf-8")
        code, output = _run(["status"])
        self.assertEqual(code, 1)
        self.assertIn("corrupt", output)

    def test_prune_drops_stale_candidates_only(self):
        self._add("auth")
        self._add("billing")
        store_path = self.root / ".specs" / "lessons.json"
        payload = json.loads(store_path.read_text())
        stale = date.today() - timedelta(days=91)
        payload["lessons"].append(
            {
                "id": "L-002",
                "title": "Idle candidate",
                "rule": "should be pruned",
                "status": "candidate",
                "source": ".specs/features/auth/validation.md",
                "features": ["auth"],
                "created": stale.isoformat(),
                "updated": stale.isoformat(),
                "penalties": 0,
            }
        )
        # Confirmed lesson is old but must stay.
        payload["lessons"][0]["updated"] = stale.isoformat()
        store_path.write_text(json.dumps(payload), encoding="utf-8")
        code, output = _run(["prune"])
        self.assertEqual(code, 0, output)
        self.assertIn("L-002", output)
        remaining = json.loads(store_path.read_text())["lessons"]
        self.assertEqual([item["id"] for item in remaining], ["L-001"])

    def test_prune_drops_candidates_with_invalid_dates(self):
        self._add("auth")
        store_path = self.root / ".specs" / "lessons.json"
        payload = json.loads(store_path.read_text())
        payload["lessons"][0]["updated"] = "not-a-date"
        store_path.write_text(json.dumps(payload), encoding="utf-8")
        code, output = _run(["prune"])
        self.assertEqual(code, 0, output)
        remaining = json.loads(store_path.read_text())["lessons"]
        self.assertEqual(remaining, [])

    def test_status_counts(self):
        self._add("auth")
        code, output = _run(["status"])
        self.assertEqual(code, 0)
        self.assertIn("candidate", output)
        self.assertRegex(output, r"candidate\s+1")

    def test_source_outside_specs_is_rejected(self):
        outside = self.root / "validation.md"
        outside.write_text(VALIDATION, encoding="utf-8")
        code, output = self._add(source=str(outside))
        self.assertEqual(code, 1)
        self.assertIn(".specs", output)

    def test_missing_title_in_store_is_corrupt(self):
        self._add()
        store_path = self.root / ".specs" / "lessons.json"
        payload = json.loads(store_path.read_text())
        del payload["lessons"][0]["title"]
        store_path.write_text(json.dumps(payload), encoding="utf-8")
        code, output = _run(["status"])
        self.assertEqual(code, 1)
        self.assertIn("corrupt", output)

    def test_infer_feature_accepts_backslash_paths(self):
        feature = lessons.infer_feature(
            Path(r"proj\features\billing\validation.md"), None
        )
        self.assertEqual(feature, "billing")


if __name__ == "__main__":
    unittest.main()
