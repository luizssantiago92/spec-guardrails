import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findVerdict, isPassVerdict } from "../lib/validation-verdict.js";

describe("validation verdict", () => {
  it("reads inline Verdict in preamble", () => {
    const text = `# Validation

Verdict: PASS

## Evidence
- REQ-001 - tests/auth.test.ts:10
`;
    assert.equal(findVerdict(text), "PASS");
    assert.equal(isPassVerdict(text), true);
  });

  it("reads ## Verdict heading form", () => {
    const text = `# Validation

## Verdict

PASS

## Evidence
- REQ-001 - tests/auth.test.ts:10
`;
    assert.equal(findVerdict(text), "PASS");
    assert.equal(isPassVerdict(text), true);
  });

  it("ignores PASS inside fenced code blocks", () => {
    const text = `# Validation

Verdict: FAIL

\`\`\`ts
// PASSED in sample only
\`\`\`
`;
    assert.equal(findVerdict(text), "FAIL");
    assert.equal(isPassVerdict(text), false);
  });

  it("ignores PASSED in coverage lines when preamble says FAIL", () => {
    const text = `# Validation

Verdict: FAIL

## Coverage
- REQ-001 PASSED in unrelated prose
`;
    assert.equal(findVerdict(text), "FAIL");
    assert.equal(isPassVerdict(text), false);
  });
});
