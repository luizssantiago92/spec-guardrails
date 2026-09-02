import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatLoopListJson,
  formatLoopPattern,
  formatLoopRunBrief,
  getLoopPattern,
  listLoopPatterns,
} from "../lib/operational-loops.js";

describe("operational loops", () => {
  it("lists shipped patterns", async () => {
    const ids = await listLoopPatterns();
    assert.ok(ids.includes("daily-triage"));
    assert.ok(ids.includes("ci-sweeper"));
    assert.equal(ids.length, 7);
  });

  it("formats pattern detail", async () => {
    const pattern = await getLoopPattern("daily-triage");
    assert.ok(pattern);
    const text = formatLoopPattern("daily-triage", pattern);
    assert.match(text, /Daily triage/);
    assert.match(text, /Constraints:/);
  });

  it("builds run brief", async () => {
    const pattern = await getLoopPattern("issue-triage");
    assert.ok(pattern);
    const brief = formatLoopRunBrief("issue-triage", pattern);
    assert.match(brief, /Operational loop/);
    assert.match(brief, /loop-patterns/);
  });

  it("exports json list shape", async () => {
    const pattern = await getLoopPattern("changelog-drafter");
    assert.ok(pattern);
    const payload = formatLoopListJson({ "changelog-drafter": pattern });
    assert.equal(payload.patterns.length, 1);
    assert.equal(payload.patterns[0].id, "changelog-drafter");
  });
});
