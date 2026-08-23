"""Adversarial cases for validate-quick."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import validate_quick  # noqa: E402


def _quick(
    *,
    task: str | None = None,
    summary: str | None = None,
) -> Path:
    temp = Path(tempfile.mkdtemp())
    if task is not None:
        (temp / "TASK.md").write_text(task, encoding="utf-8")
    if summary is not None:
        (temp / "SUMMARY.md").write_text(summary, encoding="utf-8")
    return temp


GOOD_TASK = """# Quick Task: Persist theme

- **Files**: src/hooks/useTheme.ts
- **Approach**: write preference to localStorage
- **Verify**: toggle, reload, preference persists
"""

GOOD_SUMMARY = """# Summary

- **Changed**: persisted theme preference
- **Commit**: fix(theme): persist preference (abc1234)
- **Evidence**: test/hooks/useTheme.test.ts:18
"""

MANY_FILES = """# Quick Task: Too big

- **Files**: a.ts, b.ts, c.ts, d.ts
- **Approach**: touch everything
- **Verify**: npm test
"""

AUTH_TASK = """# Quick Task: Auth tweak

- **Files**: src/auth/session.ts
- **Approach**: extend TTL
- **Verify**: login still works
"""


class ValidateQuickPassTest(unittest.TestCase):
    def test_good_quick_passes(self):
        folder = _quick(task=GOOD_TASK, summary=GOOD_SUMMARY)
        report = validate_quick.build_report(folder)
        self.assertTrue(report.passed, report.errors)


class ValidateQuickFailTest(unittest.TestCase):
    def test_too_many_files_fails(self):
        folder = _quick(task=MANY_FILES, summary=GOOD_SUMMARY)
        report = validate_quick.build_report(folder)
        self.assertFalse(report.passed)
        self.assertTrue(any("promote to /specify" in err for err in report.errors))

    def test_sensitive_path_fails(self):
        folder = _quick(task=AUTH_TASK, summary=GOOD_SUMMARY)
        report = validate_quick.build_report(folder)
        self.assertFalse(report.passed)
        self.assertTrue(any("sensitive path" in err for err in report.errors))

    def test_missing_summary_fails(self):
        folder = _quick(task=GOOD_TASK, summary=None)
        report = validate_quick.build_report(folder)
        self.assertFalse(report.passed)
        self.assertTrue(any("SUMMARY.md missing" in err for err in report.errors))

    def test_weak_evidence_fails(self):
        summary = """# Summary
- **Changed**: something
- **Evidence**: looks fine trust me
"""
        folder = _quick(task=GOOD_TASK, summary=summary)
        report = validate_quick.build_report(folder)
        self.assertFalse(report.passed)
        self.assertTrue(any("Evidence must cite" in err for err in report.errors))


class ResolveQuickDirTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.quick = self.root / ".specs" / "quick"

    def tearDown(self):
        self.tmp.cleanup()

    def _write_quick(self, name: str) -> Path:
        directory = self.quick / name
        directory.mkdir(parents=True)
        (directory / "TASK.md").write_text(GOOD_TASK, encoding="utf-8")
        (directory / "SUMMARY.md").write_text(GOOD_SUMMARY, encoding="utf-8")
        return directory

    def test_resolves_bare_nnn_slug(self):
        feature = self._write_quick("001-theme-persist")
        resolved = validate_quick.resolve_quick_dir("001-theme-persist", root=self.root)
        self.assertEqual(resolved.resolve(), feature.resolve())

    def test_rejects_path_traversal(self):
        self.quick.mkdir(parents=True)
        for raw in ("..", ".", "foo/../.."):
            with self.subTest(raw=raw):
                with self.assertRaises(SystemExit) as ctx:
                    validate_quick.resolve_quick_dir(raw, root=self.root)
                self.assertEqual(ctx.exception.code, 2)

    def test_rejects_directory_outside_specs_quick(self):
        outside = Path(tempfile.mkdtemp())
        (outside / "TASK.md").write_text(GOOD_TASK, encoding="utf-8")
        with self.assertRaises(SystemExit) as ctx:
            validate_quick.resolve_quick_dir(str(outside), root=self.root)
        self.assertEqual(ctx.exception.code, 2)

    def test_rejects_non_nnn_slug_names(self):
        self._write_quick("theme-only")
        with self.assertRaises(SystemExit) as ctx:
            validate_quick.resolve_quick_dir("theme-only", root=self.root)
        self.assertEqual(ctx.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
