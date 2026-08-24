import fs from "node:fs/promises";
import path from "node:path";

import { NPX } from "./constants.js";
import { resolveExecuteHint } from "./doctor.js";
import { readFileSafe } from "./fs-utils.js";
import {
  featureDir,
  readActiveFeatureFromState,
  resolveFeatureId,
} from "./specs-utils.js";
import { findVerdict } from "./validation-verdict.js";

/**
 * @param {string} cwd
 * @param {string} featureId
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
async function artifactExists(cwd, featureId, filename) {
  try {
    await fs.access(path.join(featureDir(featureId, cwd), filename));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} tasksText
 * @returns {{ total: number, complete: number, open: number }}
 */
function summarizeTasks(tasksText) {
  const total = (tasksText.match(/^#{2,6}\s*T\d+/gim) ?? []).length;
  const complete = (tasksText.match(/-\s*\[x\]\s*complete\b/gi) ?? []).length;
  return {
    total,
    complete,
    open: Math.max(0, total - complete),
  };
}

/**
 * @param {string} [featureArg]
 * @param {{ cwd?: string }} [options]
 */
export async function featureStatus(featureArg, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const featureId = await resolveFeatureId(
    featureArg ?? (await readActiveFeatureFromState(cwd)) ?? undefined,
    cwd,
  );

  const dir = featureDir(featureId, cwd);
  try {
    await fs.access(dir);
  } catch {
    throw new Error(`Feature directory not found: ${dir}`);
  }

  let phase = null;
  let branch = null;
  try {
    const state = await readFileSafe(path.join(cwd, ".specs/STATE.md"));
    phase = state.match(/^-\s*Phase:\s*(.+)$/m)?.[1]?.trim() ?? null;
    branch = state.match(/^-\s*Branch:\s*(.+)$/m)?.[1]?.trim() ?? null;
  } catch {
    // STATE optional for status
  }

  const artifacts = {
    spec: await artifactExists(cwd, featureId, "spec.md"),
    tasks: await artifactExists(cwd, featureId, "tasks.md"),
    design: await artifactExists(cwd, featureId, "design.md"),
    validation: await artifactExists(cwd, featureId, "validation.md"),
    taskGraph: await artifactExists(cwd, featureId, "task-graph.md"),
  };

  /** @type {{ total: number, complete: number, open: number } | null} */
  let tasks = null;
  if (artifacts.tasks) {
    const text = await readFileSafe(path.join(dir, "tasks.md"));
    tasks = summarizeTasks(text);
  }

  /** @type {string | null} */
  let verdict = null;
  if (artifacts.validation) {
    const text = await readFileSafe(path.join(dir, "validation.md"));
    verdict = findVerdict(text);
  }

  const executeHint = await resolveExecuteHint(cwd, featureId);

  /** @type {string} */
  let next;
  if (!artifacts.spec) {
    next = `${NPX(`validate-spec ${featureId}`)} — draft/approve spec.md first`;
  } else if (!artifacts.tasks) {
    next = `${NPX(`validate-spec ${featureId}`)} then /tasks`;
  } else if (tasks && tasks.open > 0) {
    next = executeHint ?? `${NPX(`loop-plan ${featureId}`)} — next Execute wave`;
  } else if (!artifacts.validation || !verdict || !/^PASS/.test(verdict)) {
    next =
      executeHint ??
      `${NPX(`validate-traceability ${featureId}`)} then ${NPX(`validate-state ${featureId}`)}`;
  } else {
    next = `${NPX(`archive-feature ${featureId}`)} — fold into domain memory`;
  }

  return {
    featureId,
    phase,
    branch,
    artifacts,
    tasks,
    verdict,
    next,
    executeHint,
  };
}

/**
 * @param {Awaited<ReturnType<typeof featureStatus>>} status
 * @returns {string}
 */
export function formatFeatureStatus(status) {
  const artifactLine = Object.entries(status.artifacts)
    .map(([name, present]) => `${present ? "✓" : "✗"} ${name}`)
    .join("  ");

  const lines = [
    `Feature: ${status.featureId}`,
    `Phase: ${status.phase ?? "—"}`,
    `Branch: ${status.branch ?? "—"}`,
    `Artifacts: ${artifactLine}`,
  ];

  if (status.tasks) {
    lines.push(
      `Tasks: ${status.tasks.complete}/${status.tasks.total} complete (${status.tasks.open} open)`,
    );
  } else {
    lines.push("Tasks: —");
  }

  lines.push(`Validation verdict: ${status.verdict ?? "—"}`);
  lines.push(`Next: ${status.next}`);
  return `${lines.join("\n")}\n`;
}
