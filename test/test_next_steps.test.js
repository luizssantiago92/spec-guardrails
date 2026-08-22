import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatInstallNextSteps } from "../lib/next-steps.js";

describe("install next steps", () => {
  it("tells humans to use the agent, not memorize CLI", () => {
    const text = formatInstallNextSteps({ pythonAvailable: true }).join("\n");
    assert.match(text, /AI coding agent/);
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
});
