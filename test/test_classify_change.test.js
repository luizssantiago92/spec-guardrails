import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyChange, formatClassifyChange } from "../lib/classify-change.js";

describe("classify-change", () => {
  it("classifies a small theme fix as quick", () => {
    const result = classifyChange({
      description: "persist dark mode preference",
      files: ["src/hooks/useTheme.ts"],
    });
    assert.equal(result.tier, "quick");
    assert.match(formatClassifyChange(result), /Tier: quick/);
  });

  it("promotes auth paths to complex", () => {
    const result = classifyChange({
      description: "add login endpoint",
      files: ["src/auth/login.ts", "src/auth/session.ts"],
    });
    assert.equal(result.tier, "complex");
  });

  it("uses medium for new feature language", () => {
    const result = classifyChange({
      description: "new feature: export CSV from dashboard",
      files: ["src/export/csv.ts", "src/pages/Dashboard.tsx", "src/api/export.ts", "src/types.ts"],
    });
    assert.equal(result.tier, "medium");
  });

  it("flags new dependency as not quick", () => {
    const result = classifyChange({
      description: "add package lodash for formatting",
      files: ["src/utils/format.ts"],
    });
    assert.notEqual(result.tier, "quick");
  });

  it("flags AI signals and suggests ai-engineering skill", () => {
    const result = classifyChange({
      description: "add RAG over internal docs with MCP tools",
      files: ["src/rag.py", "prompts/system.md"],
    });
    assert.equal(result.suggestAiSkill, true);
    assert.match(formatClassifyChange(result), /ai-engineering/);
  });

  it("suggests elicit for vague descriptions", () => {
    const result = classifyChange({
      description: "improve the settings page interface",
      files: [],
    });
    assert.equal(result.suggestElicit, true);
    assert.match(formatClassifyChange(result), /\/elicit/);
  });
});
