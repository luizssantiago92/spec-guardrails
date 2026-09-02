"""Tests for loop_plan.py — parallel wave planning."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import loop_plan  # noqa: E402

PARALLEL_TASKS = """# Tasks: CSV export

### T1: Add CSV serializer
- **Requirement**: REQ-001
- **Files**: src/export/csv.ts
- **Depends on**: —
- **Tests**: test/export/csv.test.ts
- **Gate**: npm test
- **Done when**: rows serialize to CSV
- [x] complete

### T2: Add date-range filter
- **Requirement**: REQ-002
- **Files**: src/export/filters.ts
- **Depends on**: —
- **Tests**: test/export/filters.test.ts
- **Gate**: npm test
- **Done when**: filter accepts start and end dates
- [ ] complete

### T3: Add download endpoint
- **Requirement**: REQ-003
- **Files**: src/routes/export.ts
- **Depends on**: —
- **Tests**: test/routes/export.test.ts
- **Gate**: npm test
- **Done when**: endpoint returns CSV attachment
- [ ] complete

### T4: Wire UI export button
- **Requirement**: REQ-004
- **Files**: src/components/ExportButton.tsx
- **Depends on**: T2, T3
- **Tests**: test/components/ExportButton.test.tsx
- **Gate**: npm test
- **Done when**: button triggers download
- [ ] complete
"""


class LoopPlanTest(unittest.TestCase):
    def test_parallel_wave_after_first_task_done(self):
        plan = loop_plan.build_plan(PARALLEL_TASKS)
        self.assertIn("T2", plan["ready"])
        self.assertIn("T3", plan["ready"])
        self.assertNotIn("T4", plan["ready"])
        self.assertTrue(plan["recommend_sub_agents"])
        self.assertEqual(plan["groups"][0]["mode"], "parallel")
        self.assertEqual(len(plan["groups"][0]["tasks"]), 2)

    def test_all_done(self):
        text = PARALLEL_TASKS.replace("- [ ] complete", "- [x] complete")
        plan = loop_plan.build_plan(text)
        self.assertTrue(plan["all_done"])
        self.assertFalse(plan["ready"])

    def test_json_output_shape(self):
        plan = loop_plan.build_plan(PARALLEL_TASKS)
        payload = json.dumps(plan)
        parsed = json.loads(payload)
        self.assertIn("groups", parsed)
        self.assertIn("recommend_sub_agents", parsed)
        self.assertIn("completed_count", parsed)

    def test_converge_hint_at_threshold(self):
        plan = loop_plan.build_plan(PARALLEL_TASKS)
        tasks_path = Path(".specs/features/001-export/tasks.md")
        loop_plan.apply_converge_hint(plan, tasks_path)
        self.assertNotIn("converge_hint", plan)

        plan_five = loop_plan.build_plan(PARALLEL_TASKS)
        plan_five["completed"] = ["T1", "T2", "T3", "T4", "T5"]
        plan_five["completed_count"] = 5
        loop_plan.apply_converge_hint(plan_five, tasks_path)
        self.assertTrue(plan_five.get("converge_suggest"))
        self.assertIn("converge_hint", plan_five)


if __name__ == "__main__":
    unittest.main()
