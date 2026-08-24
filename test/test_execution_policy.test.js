import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_POLICY,
  checkBudget,
  checkPathScope,
  checkTaskRetries,
  mergeExecutionPolicy,
  parseExecutionPolicySections,
} from "../lib/execution-policy.js";

describe("execution policy", () => {
  it("parses budget, scope, and escalation from config text", () => {
    const text = `
budget:
  max_iterations: 7
  max_retries_per_task: 2
scope:
  allowed_paths:
    - src/**
    - tests/**
  denied_paths:
    - secrets/**
escalation:
  on_budget_exhaustion: stop
`;

    const parsed = parseExecutionPolicySections(text);
    const policy = mergeExecutionPolicy(DEFAULT_POLICY, parsed);

    assert.equal(policy.budget.max_iterations, 7);
    assert.equal(policy.budget.max_retries_per_task, 2);
    assert.deepEqual(policy.scope.allowed_paths, ["src/**", "tests/**"]);
    assert.deepEqual(policy.scope.denied_paths, ["secrets/**"]);
    assert.equal(policy.escalation.on_budget_exhaustion, "stop");
  });

  it("blocks denied paths and enforces allowlist when configured", () => {
    const policy = mergeExecutionPolicy(DEFAULT_POLICY, {
      scope: {
        allowed_paths: ["src/**", "tests/**"],
        denied_paths: ["secrets/**"],
      },
    });

    assert.equal(checkPathScope("src/auth.ts", policy).allowed, true);
    assert.equal(checkPathScope("docs/readme.md", policy).allowed, false);
    assert.equal(checkPathScope("secrets/api.key", policy).allowed, false);
  });

  it("tracks budget and per-task retries", () => {
    const policy = mergeExecutionPolicy(DEFAULT_POLICY, {
      budget: { max_iterations: 2, max_agent_runs: 3, max_retries_per_task: 2 },
    });
    const state = { iterations: 2, agent_runs: 1, retries: { T1: 2 } };

    assert.equal(checkBudget(state, policy).ok, false);
    assert.equal(checkTaskRetries("T1", state, policy).ok, false);
    assert.equal(checkTaskRetries("T2", state, policy).ok, true);
  });
});
