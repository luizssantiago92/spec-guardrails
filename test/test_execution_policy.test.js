import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_POLICY,
  checkBudget,
  checkPathScope,
  checkTaskRetries,
  mergeExecutionPolicy,
  parseExecutionPolicySections,
  previewAgentRun,
  recordAgentRun,
  recordTaskRetry,
  resolvePathCheck,
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

  it("blocks record-retry at the configured limit", () => {
    const policy = mergeExecutionPolicy(DEFAULT_POLICY, {
      budget: { max_iterations: 5, max_agent_runs: 5, max_retries_per_task: 2 },
    });
    const state = { iterations: 0, agent_runs: 0, retries: { T1: 2 } };

    const blocked = recordTaskRetry(state, "T1", policy);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.retries, 2);
    assert.match(blocked.message ?? "", /exhausted/);
  });

  it("increments retries when under the limit", () => {
    const policy = DEFAULT_POLICY;
    const state = { iterations: 0, agent_runs: 0, retries: { T1: 1 } };

    const recorded = recordTaskRetry(state, "T1", policy);
    assert.equal(recorded.ok, true);
    assert.equal(recorded.retries, 2);
    assert.equal(recorded.state.iterations, 1);
  });

  it("blocks record-run when agent budget is exhausted", () => {
    const policy = mergeExecutionPolicy(DEFAULT_POLICY, {
      budget: { max_iterations: 5, max_agent_runs: 1, max_retries_per_task: 3 },
    });
    const state = { iterations: 0, agent_runs: 1, retries: {} };

    assert.equal(previewAgentRun(state, policy).ok, false);
    assert.equal(recordAgentRun(state, policy).ok, false);
  });

  it("honors warn escalation for denied paths", () => {
    const policy = mergeExecutionPolicy(DEFAULT_POLICY, {
      scope: {
        allowed_paths: [],
        denied_paths: ["secrets/**"],
      },
      escalation: { on_policy_violation: "warn" },
    });

    const result = resolvePathCheck("secrets/api.key", policy);
    assert.equal(result.allowed, false);
    assert.equal(result.severity, "warning");
    assert.equal(result.exitCode, 0);
  });
});
