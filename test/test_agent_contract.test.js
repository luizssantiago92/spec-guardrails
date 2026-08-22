import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AGENTS_MD_BLOCK,
} from "../lib/agents-md.js";
import {
  buildExecutionContractBlock,
  CLAUDE_MD_BLOCK,
  CURSORRULES_BLOCK,
  extractContractCore,
} from "../lib/agent-contract.js";
import { CODEX_AGENTS_BLOCK } from "../lib/codex-agents.js";
import { COPILOT_INSTRUCTIONS_BLOCK } from "../lib/copilot-instructions.js";

describe("agent execution contract parity", () => {
  it("builds adapter blocks with classify-change and feature-status", () => {
    for (const block of [
      CURSORRULES_BLOCK,
      CLAUDE_MD_BLOCK,
      COPILOT_INSTRUCTIONS_BLOCK,
      AGENTS_MD_BLOCK,
      CODEX_AGENTS_BLOCK,
    ]) {
      assert.match(block, /classify-change/);
      assert.match(block, /feature-status/);
      assert.match(block, /Sister skills/);
    }
  });

  it("keeps the same core contract across adapters (footers differ)", () => {
    const normalize = (core) =>
      core
        .replace(/`\.cursor\/skills/g, "`ADAPTER/skills")
        .replace(/`\.claude\/skills/g, "`ADAPTER/skills")
        .replace(/`\.github\/skills/g, "`ADAPTER/skills")
        .replace(/`\.codex\/skills/g, "`ADAPTER/skills");

    const cores = [
      CURSORRULES_BLOCK,
      CLAUDE_MD_BLOCK,
      COPILOT_INSTRUCTIONS_BLOCK,
      AGENTS_MD_BLOCK,
      CODEX_AGENTS_BLOCK,
    ].map((block) => normalize(extractContractCore(block)));

    const [first, ...rest] = cores;
    for (const core of rest) {
      assert.equal(core, first);
    }
  });

  it("uses the expected skill prefix per adapter", () => {
    assert.match(CURSORRULES_BLOCK, /`\.cursor\/skills\/agent-architecture\.md`/);
    assert.match(CLAUDE_MD_BLOCK, /`\.claude\/skills\/agent-architecture\.md`/);
    assert.match(COPILOT_INSTRUCTIONS_BLOCK, /`\.github\/skills\/agent-architecture\.md`/);
    assert.match(CODEX_AGENTS_BLOCK, /`\.codex\/skills\/agent-architecture\.md`/);
    assert.match(AGENTS_MD_BLOCK, /`\.github\/skills\/agent-architecture\.md`/);

    const custom = buildExecutionContractBlock({
      skillPrefix: ".example/skills",
    });
    assert.match(custom, /`\.example\/skills\/agent-architecture\.md`/);
  });
});
