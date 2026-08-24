import fs from "node:fs/promises";
import path from "node:path";

import { readFileSafe, writeFileSafe } from "./fs-utils.js";

export const POLICY_STATE_PATH = ".specs/state/execution-policy.json";

/** @type {import("./execution-policy.js").ExecutionPolicy} */
export const DEFAULT_POLICY = {
  budget: {
    max_iterations: 5,
    max_agent_runs: 12,
    max_retries_per_task: 3,
  },
  scope: {
    allowed_paths: [],
    denied_paths: ["**/.env", "**/secrets/**", "**/production/**"],
  },
  escalation: {
    on_scope_expansion: "human",
    on_budget_exhaustion: "stop",
    on_policy_violation: "block",
  },
  effects: {
    deny_read: [],
    deny_write: [],
    deny_delete: ["**/.git/**"],
    warn_read: [],
    warn_write: [],
    warn_delete: [],
  },
};

/**
 * @typedef {{
 *   budget: { max_iterations: number, max_agent_runs: number, max_retries_per_task: number },
 *   scope: { allowed_paths: string[], denied_paths: string[] },
 *   escalation: { on_scope_expansion: string, on_budget_exhaustion: string, on_policy_violation: string },
 *   effects: {
 *     deny_read: string[], deny_write: string[], deny_delete: string[],
 *     warn_read: string[], warn_write: string[], warn_delete: string[],
 *   },
 * }} ExecutionPolicy
 */

/** @typedef {"read" | "write" | "delete"} PathOperation */

/**
 * @typedef {{
 *   iterations: number,
 *   agent_runs: number,
 *   retries: Record<string, number>,
 * }} ExecutionPolicyState
 */

/**
 * Parse budget/scope/escalation blocks from `.specs/config.yaml` text.
 *
 * @param {string} text
 * @returns {Partial<ExecutionPolicy>}
 */
export function parseExecutionPolicySections(text) {
  /** @type {Partial<ExecutionPolicy>} */
  const result = {};
  /** @type {"budget" | "scope" | "escalation" | "effects" | null} */
  let section = null;
  /** @type {string | null} */
  let listKey = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const sectionMatch = trimmed.match(/^(budget|scope|escalation|effects):\s*$/);
    if (sectionMatch) {
      section = /** @type {"budget" | "scope" | "escalation" | "effects"} */ (sectionMatch[1]);
      result[section] = result[section] ?? {};
      listKey = null;
      continue;
    }

    const kv = trimmed.match(/^([a-z_]+):\s*(.*)$/);
    if (kv && section) {
      const key = kv[1];
      const rawValue = kv[2].replace(/^['"]|['"]$/g, "");
      const bucket = /** @type {Record<string, unknown>} */ (result[section]);

      if (rawValue === "") {
        listKey = key;
        bucket[listKey] = [];
        continue;
      }

      if (/^\d+$/.test(rawValue)) {
        bucket[key] = Number(rawValue);
      } else {
        bucket[key] = rawValue;
      }
      listKey = null;
      continue;
    }

    const listItem = trimmed.match(/^-\s+(.+)$/);
    if (listItem && section && listKey) {
      const bucket = /** @type {Record<string, string[]>} */ (result[section]);
      bucket[listKey] = bucket[listKey] ?? [];
      bucket[listKey].push(listItem[1].replace(/^['"]|['"]$/g, ""));
    }
  }

  return result;
}

/**
 * @param {ExecutionPolicy} base
 * @param {Partial<ExecutionPolicy>} overlay
 * @returns {ExecutionPolicy}
 */
export function mergeExecutionPolicy(base, overlay) {
  return {
    budget: { ...base.budget, ...(overlay.budget ?? {}) },
    scope: {
      allowed_paths: overlay.scope?.allowed_paths ?? base.scope.allowed_paths,
      denied_paths: overlay.scope?.denied_paths ?? base.scope.denied_paths,
    },
    escalation: { ...base.escalation, ...(overlay.escalation ?? {}) },
    effects: {
      deny_read: overlay.effects?.deny_read ?? base.effects.deny_read,
      deny_write: overlay.effects?.deny_write ?? base.effects.deny_write,
      deny_delete: overlay.effects?.deny_delete ?? base.effects.deny_delete,
      warn_read: overlay.effects?.warn_read ?? base.effects.warn_read,
      warn_write: overlay.effects?.warn_write ?? base.effects.warn_write,
      warn_delete: overlay.effects?.warn_delete ?? base.effects.warn_delete,
    },
  };
}

/**
 * @param {string} cwd
 * @returns {Promise<ExecutionPolicy>}
 */
export async function loadExecutionPolicy(cwd = process.cwd()) {
  const configPath = path.join(cwd, ".specs/config.yaml");
  let policy = structuredClone(DEFAULT_POLICY);

  try {
    const text = await readFileSafe(configPath);
    policy = mergeExecutionPolicy(policy, parseExecutionPolicySections(text));
  } catch (err) {
    if (!/cannot read/i.test(String(err.message)) && err.code !== "ENOENT") {
      throw err;
    }
  }

  return policy;
}

/**
 * @param {string} pattern
 * @param {string} value
 * @returns {boolean}
 */
export function matchGlobPattern(pattern, value) {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const normalizedValue = value.replace(/\\/g, "/");
  const regex = new RegExp(
    `^${normalizedPattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")}$`,
  );
  return regex.test(normalizedValue);
}

/**
 * @param {string} relativePath
 * @param {ExecutionPolicy} policy
 * @returns {{ allowed: boolean, severity: "blocking" | "info", reason: string }}
 */
export function checkPathScope(relativePath, policy) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");

  for (const denied of policy.scope.denied_paths) {
    if (matchGlobPattern(denied, normalized)) {
      return {
        allowed: false,
        severity: "blocking",
        reason: `path matches denied pattern: ${denied}`,
      };
    }
  }

  if (!policy.scope.allowed_paths.length) {
    return { allowed: true, severity: "info", reason: "no allowlist configured" };
  }

  for (const allowed of policy.scope.allowed_paths) {
    if (matchGlobPattern(allowed, normalized)) {
      return {
        allowed: true,
        severity: "info",
        reason: `path matches allowed pattern: ${allowed}`,
      };
    }
  }

  return {
    allowed: false,
    severity: "blocking",
    reason: "path outside configured allowed_paths",
  };
}

const PATH_OPERATIONS = new Set(["read", "write", "delete"]);

/**
 * @param {string | undefined | null} raw
 * @returns {PathOperation}
 */
export function normalizePathOperation(raw) {
  const value = String(raw ?? "write").trim().toLowerCase();
  if (!PATH_OPERATIONS.has(value)) {
    throw new Error(`unknown operation '${raw}' — use read, write, or delete`);
  }
  return /** @type {PathOperation} */ (value);
}

/**
 * Heuristic intent when the agent did not declare an operation explicitly.
 *
 * @param {string} relativePath
 * @returns {PathOperation}
 */
export function inferPathOperation(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  const readOnly = /\.(md|txt|json|yaml|yml|lock)$/i.test(normalized);
  return readOnly ? "read" : "write";
}

/**
 * @param {PathOperation} operation
 * @param {ExecutionPolicy["effects"]} effects
 * @returns {{ deny: string[], warn: string[] }}
 */
export function effectRulesForOperation(operation, effects) {
  return {
    deny: effects[`deny_${operation}`] ?? [],
    warn: effects[`warn_${operation}`] ?? [],
  };
}

/**
 * @param {string} relativePath
 * @param {PathOperation} operation
 * @param {ExecutionPolicy} policy
 * @returns {{ allowed: boolean, severity: "blocking" | "warning" | "info", reason: string, operation: PathOperation }}
 */
export function checkPathEffect(relativePath, operation, policy) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  const { deny, warn } = effectRulesForOperation(operation, policy.effects);

  for (const pattern of deny) {
    if (matchGlobPattern(pattern, normalized)) {
      return {
        allowed: false,
        severity: "blocking",
        reason: `${operation.toUpperCase()} denied for path matching ${pattern}`,
        operation,
      };
    }
  }

  for (const pattern of warn) {
    if (matchGlobPattern(pattern, normalized)) {
      return {
        allowed: true,
        severity: "warning",
        reason: `${operation.toUpperCase()} warned for path matching ${pattern}`,
        operation,
      };
    }
  }

  return {
    allowed: true,
    severity: "info",
    reason: `no ${operation} effect rules matched`,
    operation,
  };
}

/**
 * @param {string} relativePath
 * @param {ExecutionPolicy} policy
 * @param {{ operation?: string | null }} [options]
 * @returns {{
 *   allowed: boolean,
 *   exitCode: number,
 *   severity: "blocking" | "warning" | "info",
 *   reason: string,
 *   operation: PathOperation,
 *   scope: ReturnType<typeof checkPathScope>,
 *   effect: ReturnType<typeof checkPathEffect>,
 * }}
 */
export function resolvePathCheck(relativePath, policy, options = {}) {
  const operation = options.operation
    ? normalizePathOperation(options.operation)
    : inferPathOperation(relativePath);
  const scope = checkPathScope(relativePath, policy);
  const effect = checkPathEffect(relativePath, operation, policy);

  if (!scope.allowed) {
    const mode = policy.escalation.on_policy_violation ?? "block";
    return {
      allowed: false,
      severity: mode === "warn" ? "warning" : "blocking",
      reason: scope.reason,
      operation,
      scope,
      effect,
      exitCode: mode === "warn" ? 0 : 1,
    };
  }

  if (!effect.allowed) {
    const mode = policy.escalation.on_policy_violation ?? "block";
    return {
      allowed: false,
      severity: mode === "warn" ? "warning" : "blocking",
      reason: effect.reason,
      operation,
      scope,
      effect,
      exitCode: mode === "warn" ? 0 : 1,
    };
  }

  if (effect.severity === "warning") {
    return {
      allowed: true,
      severity: "warning",
      reason: effect.reason,
      operation,
      scope,
      effect,
      exitCode: 0,
    };
  }

  return {
    allowed: true,
    severity: "info",
    reason: scope.reason,
    operation,
    scope,
    effect,
    exitCode: 0,
  };
}

/**
 * @param {string} cwd
 * @returns {Promise<ExecutionPolicyState>}
 */
export async function loadPolicyState(cwd = process.cwd()) {
  const statePath = path.join(cwd, POLICY_STATE_PATH);
  try {
    const raw = await readFileSafe(statePath);
    return /** @type {ExecutionPolicyState} */ (JSON.parse(raw));
  } catch {
    return { iterations: 0, agent_runs: 0, retries: {} };
  }
}

/**
 * @param {string} cwd
 * @param {ExecutionPolicyState} state
 */
export async function savePolicyState(cwd, state) {
  const statePath = path.join(cwd, POLICY_STATE_PATH);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await writeFileSafe(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * @param {ExecutionPolicyState} state
 * @param {ExecutionPolicy} policy
 * @returns {{ ok: boolean, issues: Array<{ severity: "blocking", message: string }> }}
 */
export function checkBudget(state, policy) {
  /** @type {Array<{ severity: "blocking", message: string }>} */
  const issues = [];

  if (state.iterations >= policy.budget.max_iterations) {
    issues.push({ severity: "blocking", message: "max_iterations budget exhausted" });
  }

  if (state.agent_runs >= policy.budget.max_agent_runs) {
    issues.push({ severity: "blocking", message: "max_agent_runs budget exhausted" });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {string} taskId
 * @param {ExecutionPolicyState} state
 * @param {ExecutionPolicy} policy
 * @returns {{ ok: boolean, severity?: "blocking", message?: string, retries: number }}
 */
export function previewTaskRetry(taskId, state, policy) {
  const retries = state.retries[taskId] ?? 0;
  if (retries >= policy.budget.max_retries_per_task) {
    return {
      ok: false,
      severity: "blocking",
      message: `max_retries_per_task exhausted for ${taskId}`,
      retries,
    };
  }
  return { ok: true, retries };
}

/**
 * @param {string} taskId
 * @param {ExecutionPolicyState} state
 * @param {ExecutionPolicy} policy
 * @returns {{ ok: boolean, severity?: "blocking", message?: string, retries: number }}
 */
export function checkTaskRetries(taskId, state, policy) {
  const preview = previewTaskRetry(taskId, state, policy);
  return preview.ok
    ? { ok: true, retries: preview.retries }
    : {
        ok: false,
        severity: preview.severity,
        message: preview.message,
        retries: preview.retries,
      };
}

/**
 * @param {ExecutionPolicyState} state
 * @param {ExecutionPolicy} policy
 * @returns {{ ok: boolean, message?: string }}
 */
export function previewAgentRun(state, policy) {
  if (state.agent_runs >= policy.budget.max_agent_runs) {
    return { ok: false, message: "max_agent_runs budget exhausted" };
  }
  return { ok: true };
}

/**
 * @param {ExecutionPolicyState} state
 * @param {string} taskId
 * @param {ExecutionPolicy} policy
 * @returns {{ ok: boolean, state: ExecutionPolicyState, retries: number, message?: string }}
 */
export function recordTaskRetry(state, taskId, policy) {
  const preview = previewTaskRetry(taskId, state, policy);
  if (!preview.ok) {
    return { ok: false, state, retries: preview.retries, message: preview.message };
  }

  const next = structuredClone(state);
  next.retries[taskId] = (next.retries[taskId] ?? 0) + 1;
  next.iterations += 1;
  return { ok: true, state: next, retries: next.retries[taskId] };
}

/**
 * @param {ExecutionPolicyState} state
 * @param {ExecutionPolicy} policy
 * @returns {{ ok: boolean, state: ExecutionPolicyState, message?: string }}
 */
export function recordAgentRun(state, policy) {
  const preview = previewAgentRun(state, policy);
  if (!preview.ok) {
    return { ok: false, state, message: preview.message };
  }

  const next = structuredClone(state);
  next.agent_runs += 1;
  return { ok: true, state: next };
}

/**
 * @param {ExecutionPolicy} policy
 * @param {ExecutionPolicyState} state
 * @param {{ json?: boolean }} [options]
 */
export function formatPolicyStatus(policy, state, options = {}) {
  const budget = checkBudget(state, policy);
  const payload = {
    policy,
    state,
    budget,
    escalation: policy.escalation,
  };

  if (options.json) {
    return JSON.stringify(payload, null, 2);
  }

  const lines = [
    "Execution policy status:",
    `  iterations: ${state.iterations}/${policy.budget.max_iterations}`,
    `  agent_runs: ${state.agent_runs}/${policy.budget.max_agent_runs}`,
    `  allowed_paths: ${policy.scope.allowed_paths.length ? policy.scope.allowed_paths.join(", ") : "(none — all non-denied paths allowed)"}`,
    `  denied_paths: ${policy.scope.denied_paths.join(", ")}`,
    `  deny_delete: ${policy.effects.deny_delete.join(", ") || "(default .git only)"}`,
    `  budget_ok: ${budget.ok ? "yes" : "no"}`,
  ];

  if (!budget.ok) {
    for (const issue of budget.issues) {
      lines.push(`  blocking: ${issue.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
