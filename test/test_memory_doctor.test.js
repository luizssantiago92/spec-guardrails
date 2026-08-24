import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memoryHintFromStatus } from "../lib/memory-doctor.js";

describe("memory doctor hints", () => {
  it("suggests rebuild when artifacts exist but database is missing", () => {
    const hint = memoryHintFromStatus({
      database: ".specs/memory/memory.db",
      exists: false,
      semantic_enabled: false,
      provider: "none",
      entities: 0,
      chunks: 0,
      embeddings: 0,
      has_artifacts: true,
      stale: true,
    });

    assert.match(hint ?? "", /memory-index rebuild/);
  });

  it("suggests embed when semantic is enabled with few embeddings", () => {
    const hint = memoryHintFromStatus({
      database: ".specs/memory/memory.db",
      exists: true,
      semantic_enabled: true,
      provider: "openai",
      entities: 4,
      chunks: 4,
      embeddings: 0,
      has_artifacts: true,
      stale: false,
    });

    assert.match(hint ?? "", /memory-index embed/);
  });

  it("returns null when index is fresh and semantic is off", () => {
    const hint = memoryHintFromStatus({
      database: ".specs/memory/memory.db",
      exists: true,
      semantic_enabled: false,
      provider: "none",
      entities: 4,
      chunks: 2,
      embeddings: 0,
      has_artifacts: true,
      stale: false,
    });

    assert.equal(hint, null);
  });
});
