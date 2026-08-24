import path from "node:path";

import { loadExecutionPolicy, resolvePathCheck } from "./execution-policy.js";
import { readFileSafe } from "./fs-utils.js";
import { featureDir, readActiveFeatureFromState, resolveFeatureId } from "./specs-utils.js";
import { findVerdict } from "./validation-verdict.js";

const TASK_FILES = /^\s*[-*]?\s*\*{0,2}Files\*{0,2}\s*:\s*(.+)$/gim;

/**
 * @param {string} cwd
 * @returns {Promise<{ featureId: string | null, phase: string | null }>}
 */
export async function readStateContext(cwd) {
  const statePath = path.join(cwd, ".specs/STATE.md");
  let content = "";

  try {
    content = await readFileSafe(statePath);
  } catch {
    return { featureId: null, phase: null };
  }

  const featureId = await readActiveFeatureFromState(cwd);
  const phaseMatch = content.match(/^-\s*Phase:\s*(.+)$/m);
  const phase = phaseMatch ? phaseMatch[1].trim() : null;

  return { featureId, phase: phase && !/^—|-$/i.test(phase) ? phase : null };
}

/**
 * @param {string} tasksText
 * @returns {number}
 */
export function countOpenTasks(tasksText) {
  return [...tasksText.matchAll(/^\s*[-*]\s*\[ \]\s+/gm)].length;
}

/**
 * @param {string} tasksText
 * @returns {Set<string>}
 */
export function collectTaskFilePaths(tasksText) {
  /** @type {Set<string>} */
  const files = new Set();

  for (const match of tasksText.matchAll(TASK_FILES)) {
    const raw = match[1].trim();
    if (!raw || /^—|-$|none|n\/a$/i.test(raw)) {
      continue;
    }
    for (const part of raw.split(/[,;]/)) {
      const cleaned = part.trim().replace(/^`|`$/g, "");
      if (cleaned) {
        files.add(cleaned.replace(/\\/g, "/"));
      }
    }
  }

  return files;
}

/**
 * @param {string} relativePath
 * @param {Set<string>} approvedFiles
 * @returns {boolean}
 */
export function pathInApprovedTaskFiles(relativePath, approvedFiles) {
  if (!approvedFiles.size) {
    return true;
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  for (const approved of approvedFiles) {
    const pattern = approved.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    if (new RegExp(`^${pattern}$`).test(normalized)) {
      return true;
    }
    if (normalized === approved || normalized.endsWith(`/${approved}`)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} cwd
 * @param {{ featureId?: string }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   severity: "blocking" | "warning" | "info",
 *   featureId: string | null,
 *   phase: string | null,
 *   openTasks: number,
 *   messages: string[],
 * }>}
 */
export async function evaluateExecuteContext(cwd, options = {}) {
  const messages = [];
  const state = await readStateContext(cwd);
  let featureId = options.featureId ?? state.featureId;

  if (!featureId) {
    return {
      ok: false,
      severity: "blocking",
      featureId: null,
      phase: state.phase,
      openTasks: 0,
      messages: ["no active feature in .specs/STATE.md — run feature-init or /specify first"],
    };
  }

  const tasksPath = path.join(featureDir(featureId, cwd), "tasks.md");
  let tasksText = "";

  try {
    tasksText = await readFileSafe(tasksPath);
  } catch {
    return {
      ok: false,
      severity: "blocking",
      featureId,
      phase: state.phase,
      openTasks: 0,
      messages: [`tasks.md missing for active feature ${featureId}`],
    };
  }

  const openTasks = countOpenTasks(tasksText);
  if (openTasks === 0) {
    messages.push("no open tasks in tasks.md — Execute may be complete; run /verify instead");
  } else {
    messages.push(`${openTasks} open task(s) in tasks.md`);
  }

  const severity = openTasks === 0 ? "warning" : "info";
  return {
    ok: openTasks > 0,
    severity,
    featureId,
    phase: state.phase,
    openTasks,
    messages,
  };
}

/**
 * @param {string} cwd
 * @param {string} relativePath
 * @param {{ operation?: string, featureId?: string, strictFiles?: boolean }} [options]
 */
export async function checkBeforeEdit(cwd, relativePath, options = {}) {
  const execute = await evaluateExecuteContext(cwd, { featureId: options.featureId });
  const policy = await loadExecutionPolicy(cwd);
  const pathCheck = resolvePathCheck(relativePath, policy, {
    operation: options.operation,
  });

  /** @type {string[]} */
  const messages = [...execute.messages];

  if (!execute.ok && execute.severity === "blocking") {
    return {
      allowed: false,
      exitCode: 1,
      severity: "blocking",
      operation: pathCheck.operation,
      featureId: execute.featureId,
      messages,
    };
  }

  if (!pathCheck.allowed) {
    messages.push(pathCheck.reason);
    return {
      allowed: false,
      exitCode: pathCheck.exitCode,
      severity: pathCheck.severity,
      operation: pathCheck.operation,
      featureId: execute.featureId,
      messages,
    };
  }

  if (options.strictFiles !== false && execute.featureId) {
    const tasksText = await readFileSafe(
      path.join(featureDir(execute.featureId, cwd), "tasks.md"),
    );
    const approved = collectTaskFilePaths(tasksText);
    if (approved.size && !pathInApprovedTaskFiles(relativePath, approved)) {
      messages.push("path is not listed in any task Files field — escalate or update tasks.md");
      const mode = policy.escalation.on_scope_expansion ?? "human";
      if (mode === "human") {
        return {
          allowed: false,
          exitCode: 1,
          severity: "blocking",
          operation: pathCheck.operation,
          featureId: execute.featureId,
          messages,
        };
      }
    }
  }

  if (pathCheck.severity === "warning") {
    messages.push(pathCheck.reason);
  }

  if (!execute.ok && execute.severity === "warning") {
    messages.push(...execute.messages);
  }

  return {
    allowed: true,
    exitCode: 0,
    severity: pathCheck.severity === "warning" || execute.severity === "warning" ? "warning" : "info",
    operation: pathCheck.operation,
    featureId: execute.featureId,
    messages,
  };
}

/**
 * @param {string} cwd
 * @param {string} [featureRaw]
 */
export async function checkBeforeComplete(cwd, featureRaw) {
  const featureId = featureRaw ? await resolveFeatureId(featureRaw, cwd) : await resolveFeatureId(undefined, cwd);
  const dir = featureDir(featureId, cwd);
  /** @type {string[]} */
  const messages = [];

  let tasksText = "";
  try {
    tasksText = await readFileSafe(path.join(dir, "tasks.md"));
  } catch {
    return {
      allowed: false,
      exitCode: 1,
      severity: "blocking",
      featureId,
      messages: ["tasks.md missing — cannot claim completion"],
    };
  }

  const openTasks = countOpenTasks(tasksText);
  if (openTasks > 0) {
    messages.push(`${openTasks} task(s) still open in tasks.md`);
    return {
      allowed: false,
      exitCode: 1,
      severity: "blocking",
      featureId,
      messages,
    };
  }

  const validationPath = path.join(dir, "validation.md");
  let validationText = "";
  try {
    validationText = await readFileSafe(validationPath);
  } catch {
    messages.push("validation.md missing — run independent /verify first");
    return {
      allowed: false,
      exitCode: 1,
      severity: "blocking",
      featureId,
      messages,
    };
  }

  const verdict = findVerdict(validationText);
  if (!verdict || !["PASS", "PASSED"].includes(verdict)) {
    messages.push(verdict ? `validation verdict is ${verdict}, not PASS` : "validation.md has no PASS/FAIL verdict");
    return {
      allowed: false,
      exitCode: 1,
      severity: "blocking",
      featureId,
      messages,
    };
  }

  messages.push("tasks complete and validation PASS recorded");
  return {
    allowed: true,
    exitCode: 0,
    severity: "info",
    featureId,
    messages,
  };
}

/**
 * @param {Awaited<ReturnType<typeof evaluateExecuteContext>>} context
 * @param {{ json?: boolean }} [options]
 */
export function formatContextGuardStatus(context, options = {}) {
  if (options.json) {
    return JSON.stringify(context, null, 2);
  }

  const lines = ["Context guard status:"];
  lines.push(`  feature: ${context.featureId ?? "(none)"}`);
  lines.push(`  phase: ${context.phase ?? "(unknown)"}`);
  lines.push(`  open_tasks: ${context.openTasks}`);
  lines.push(`  execute_ready: ${context.ok ? "yes" : "no"}`);
  for (const message of context.messages) {
    lines.push(`  note: ${message}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {Awaited<ReturnType<typeof checkBeforeEdit>>} result
 * @param {string} relativePath
 * @param {{ json?: boolean }} [options]
 */
export function formatCheckBeforeEdit(result, relativePath, options = {}) {
  if (options.json) {
    return JSON.stringify({ path: relativePath, ...result }, null, 2);
  }

  const label = result.allowed
    ? result.severity === "warning"
      ? "allowed (warn)"
      : "allowed"
    : result.severity === "warning"
      ? "blocked (warn)"
      : "blocked";

  const lines = [`${relativePath} [${result.operation}]: ${label}`];
  for (const message of result.messages) {
    lines.push(`  ${message}`);
  }
  return `${lines.join("\n")}\n`;
}
