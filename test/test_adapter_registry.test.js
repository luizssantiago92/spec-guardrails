import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADAPTER_REGISTRY,
  getAdapter,
  getAdaptersWithCapability,
  listAdapters,
} from "../lib/adapter-registry.js";

describe("adapter registry", () => {
  it("registers the shipped platform adapters", () => {
    const ids = listAdapters().map((adapter) => adapter.id);
    assert.deepEqual(ids, ["cursor", "claude", "copilot", "codex", "agents-md"]);
  });

  it("exposes capability metadata per adapter", () => {
    const cursor = getAdapter("cursor");
    assert.ok(cursor);
    assert.equal(cursor.capabilities.supports_skills, true);

    const agentsMd = getAdapter("agents-md");
    assert.ok(agentsMd);
    assert.equal(agentsMd.capabilities.supports_skills, false);
  });

  it("filters adapters by capability", () => {
    const skillAdapters = getAdaptersWithCapability("supports_skills");
    assert.ok(skillAdapters.length >= 4);
    assert.ok(skillAdapters.every((adapter) => adapter.skillsDir));
    assert.equal(ADAPTER_REGISTRY.length, listAdapters().length);
  });
});
