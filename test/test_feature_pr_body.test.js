import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatPrBody } from "../lib/feature-pr-body.js";

describe("feature-pr-body", () => {
  it("formats traceability table for PR body", () => {
    const body = formatPrBody({
      featureId: "003-auth",
      goal: "Password reset flow",
      status: { phase: "Verify", verdict: "PASS" },
      traceability: [
        {
          reqId: "REQ-001",
          tasks: ["T1"],
          evidence: "test/auth/reset.test.ts:12",
        },
      ],
    });

    assert.match(body, /## Summary/);
    assert.match(body, /Password reset flow/);
    assert.match(body, /REQ-001/);
    assert.match(body, /reset\.test\.ts:12/);
  });
});
