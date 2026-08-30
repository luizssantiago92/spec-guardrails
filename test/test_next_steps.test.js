import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatInstallNextSteps } from "../lib/next-steps.js";

describe("install next steps", () => {
  it("tells humans to use the agent, not memorize CLI", () => {
    const text = formatInstallNextSteps({ pythonAvailable: true }).join("\n");
    assert.match(text, /AI coding agent|Open Cursor/);
    assert.match(text, /Specify/);
    assert.match(text, /GETTING_STARTED\.md/);
    assert.match(text, /Quick-start/);
    assert.match(text, /Optional CLI/);
    assert.doesNotMatch(text, /validate-spec/);
  });

  it("mentions python when gates are unavailable", () => {
    const text = formatInstallNextSteps({ pythonAvailable: false }).join("\n");
    assert.match(text, /Python 3\.10\+/);
  });

  it("names the detected platform instead of listing every adapter", () => {
    const text = formatInstallNextSteps({
      detected: "cursor",
      skillDirs: [".cursor/skills"],
    }).join("\n");
    assert.match(text, /Cursor/);
    assert.match(text, /\.cursor\/skills/);
    assert.match(text, /--all-platforms/);
    assert.doesNotMatch(text, /Claude, Copilot, Codex, or AGENTS\.md adapters install automatically/);
  });

  it("describes all-platforms install when requested", () => {
    const text = formatInstallNextSteps({ allPlatforms: true }).join("\n");
    assert.match(text, /Cursor, Claude, Copilot, and Codex/);
  });

  it("mentions preserved trees when multiple skill dirs are refreshed", () => {
    const text = formatInstallNextSteps({
      detected: "cursor",
      skillDirs: [".cursor/skills", ".claude/skills"],
    }).join("\n");
    assert.match(text, /preserved/i);
    assert.match(text, /\.claude\/skills/);
  });
});
