"""Cases for validate-ship-surface (Ship Surface + AI Surface)."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import validate_ship_surface  # noqa: E402


DESIGN_SHIP_OK = """# Design: API deploy

## Ship Surface

| Field | Value |
| --- | --- |
| Deploy unit | docker compose service api |
| CI | .github/workflows/ci.yml |
| Rollback | helm rollback release 1 |
| Observability | health metric on /health |

## AI Surface

| Field | Value |
| --- | --- |
| Eval harness | pytest tests/eval/ |
| Fallback / degrade | return 503 with safe message |
"""

TASKS_INFRA = """# Tasks

### T1: Update compose
- **Requirement**: REQ-001
- **Files**: docker-compose.yml
- **Depends on**: —
- **Tests**: tests/test_compose.py
- **Gate**: docker compose config --quiet
- **Done when**: service defined
"""

TASKS_AI = """# Tasks

### T1: RAG eval
- **Requirement**: REQ-001
- **Files**: tests/eval/test_rag.py
- **Depends on**: —
- **Tests**: tests/eval/test_rag.py
- **Gate**: pytest tests/eval/
- **Done when**: golden set passes
"""

TASKS_APP_ONLY = """# Tasks

### T1: Logic
- **Requirement**: REQ-001
- **Files**: src/core.py
- **Depends on**: —
- **Tests**: tests/test_core.py
- **Gate**: pytest
- **Done when**: tests pass
"""


class ValidateShipSurfaceTests(unittest.TestCase):
    def _feature_dir(self) -> tempfile.TemporaryDirectory[str]:
        return tempfile.TemporaryDirectory()

    def test_skips_when_no_infra_or_ai_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            feature = Path(tmp) / "001-app"
            feature.mkdir()
            (feature / "tasks.md").write_text(TASKS_APP_ONLY, encoding="utf-8")
            report = validate_ship_surface.build_report(feature, tmp)
            self.assertTrue(report.passed)
            self.assertTrue(any("not required" in check for check in report.checks))

    def test_requires_ship_surface_for_infra_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            feature = Path(tmp) / "001-deploy"
            feature.mkdir()
            (feature / "tasks.md").write_text(TASKS_INFRA, encoding="utf-8")
            report = validate_ship_surface.build_report(feature, tmp)
            self.assertFalse(report.passed)
            self.assertTrue(
                any("Ship Surface" in err or "design.md missing" in err for err in report.errors)
            )

    def test_passes_ship_surface_when_complete(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            feature = Path(tmp) / "001-deploy"
            feature.mkdir()
            (feature / "tasks.md").write_text(TASKS_INFRA, encoding="utf-8")
            (feature / "design.md").write_text(DESIGN_SHIP_OK, encoding="utf-8")
            report = validate_ship_surface.build_report(feature, tmp)
            self.assertTrue(report.passed)

    def test_requires_ai_surface_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            feature = Path(tmp) / "001-rag"
            feature.mkdir()
            (feature / "tasks.md").write_text(TASKS_AI, encoding="utf-8")
            (feature / "design.md").write_text(
                "# Design\n\n## Ship Surface\n\n- **Deploy unit**: worker\n"
                "- **CI**: ci.yml\n- **Rollback**: redeploy\n",
                encoding="utf-8",
            )
            report = validate_ship_surface.build_report(feature, tmp)
            self.assertFalse(report.passed)
            self.assertTrue(any("AI Surface" in err for err in report.errors))

    def test_passes_ai_surface_when_harness_and_fallback_present(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            feature = Path(tmp) / "001-rag"
            feature.mkdir()
            (feature / "tasks.md").write_text(TASKS_AI, encoding="utf-8")
            (feature / "design.md").write_text(
                "# Design\n\n## AI Surface\n\n"
                "- **Eval harness**: pytest tests/eval/\n"
                "- **Fallback / degrade**: cached answer\n",
                encoding="utf-8",
            )
            report = validate_ship_surface.build_report(feature, tmp)
            self.assertTrue(report.passed)


if __name__ == "__main__":
    unittest.main()
