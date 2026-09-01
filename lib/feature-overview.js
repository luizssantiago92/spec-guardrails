import fs from "node:fs/promises";
import path from "node:path";

import { readFileSafe } from "./fs-utils.js";
import { featureStatus } from "./feature-status.js";
import { featureDir, resolveFeatureId } from "./specs-utils.js";

const REQ_ID = /\b[A-Z][A-Z0-9]{1,9}-\d{2,4}\b/g;
const TASK_HEADING = /^#{2,6}\s*(T\d+)[:\s]+(.+)$/gim;
const TASK_FIELD =
  /^\s*[-*]?\s*\*{0,2}([A-Za-z][A-Za-z ]+?)\*{0,2}\s*:\s*(.+?)\s*$/gim;
const EVIDENCE = /[\w./\\-]+\.[A-Za-z][A-Za-z0-9]{0,9}:\d{1,6}\b/g;

/**
 * @param {string} text
 * @returns {string[]}
 */
function uniqueReqIds(text) {
  return [...new Set(text.match(REQ_ID) ?? [])];
}

/**
 * @param {string} tasksText
 * @returns {Array<{ id: string, title: string, requirement: string | null, complete: boolean }>}
 */
function parseTasks(tasksText) {
  const headings = [...tasksText.matchAll(TASK_HEADING)];
  /** @type {Array<{ id: string, title: string, requirement: string | null, complete: boolean }>} */
  const tasks = [];

  for (let i = 0; i < headings.length; i += 1) {
    const start = headings[i].index ?? 0;
    const end = headings[i + 1]?.index ?? tasksText.length;
    const block = tasksText.slice(start, end);
    const id = headings[i][1];
    const title = headings[i][2].trim();
    let requirement = null;
    for (const match of block.matchAll(TASK_FIELD)) {
      if (match[1].trim().toLowerCase() === "requirement") {
        requirement = match[2].trim();
        break;
      }
    }
    const complete = /-\s*\[x\]\s*complete\b/i.test(block);
    tasks.push({ id, title, requirement, complete });
  }
  return tasks;
}

/**
 * @param {string} validationText
 * @param {string} reqId
 * @returns {string | null}
 */
function evidenceForReq(validationText, reqId) {
  for (const line of validationText.split(/\r?\n/)) {
    if (!line.includes(reqId)) {
      continue;
    }
    const hit = line.match(EVIDENCE);
    if (hit?.[0]) {
      return hit[0];
    }
  }
  return null;
}

/**
 * @param {string} specText
 * @returns {string | null}
 */
function summarizeGoal(specText) {
  const title = specText.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (title && !/^spec/i.test(title)) {
    return title;
  }
  const firstReq = specText.match(
    /^###\s+([A-Z][A-Z0-9]{1,9}-\d{2,4})\b[^\n]*\n+([^\n#]+)/m,
  );
  if (firstReq) {
    return `${firstReq[1]} — ${firstReq[2].trim()}`;
  }
  return title ?? null;
}

/**
 * @param {string} [featureArg]
 * @param {{ cwd?: string }} [options]
 */
export async function buildFeatureOverview(featureArg, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const featureId = await resolveFeatureId(featureArg, cwd);
  const status = await featureStatus(featureId, { cwd });
  const dir = featureDir(featureId, cwd);

  let specText = "";
  let tasksText = "";
  let validationText = "";

  try {
    specText = await readFileSafe(path.join(dir, "spec.md"));
  } catch {
    // optional until Specify
  }
  try {
    tasksText = await readFileSafe(path.join(dir, "tasks.md"));
  } catch {
    // optional until Tasks
  }
  try {
    validationText = await readFileSafe(path.join(dir, "validation.md"));
  } catch {
    // optional until Verify
  }

  const reqIds = uniqueReqIds(specText);
  const tasks = tasksText ? parseTasks(tasksText) : [];
  const reqToTasks = new Map();
  for (const task of tasks) {
    if (!task.requirement) {
      continue;
    }
    for (const reqId of uniqueReqIds(task.requirement)) {
      const list = reqToTasks.get(reqId) ?? [];
      list.push(task.id);
      reqToTasks.set(reqId, list);
    }
  }

  const traceability = reqIds.map((reqId) => ({
    reqId,
    tasks: reqToTasks.get(reqId) ?? [],
    evidence: validationText ? evidenceForReq(validationText, reqId) : null,
  }));

  return {
    featureId,
    generatedAt: new Date().toISOString(),
    goal: specText ? summarizeGoal(specText) : null,
    status,
    tasks,
    traceability,
  };
}

/**
 * @param {Awaited<ReturnType<typeof buildFeatureOverview>>} overview
 * @returns {string}
 */
export function formatFeatureOverview(overview) {
  const { status } = overview;
  const artifactRows = Object.entries(status.artifacts)
    .map(([name, present]) => `| ${name} | ${present ? "present" : "missing"} |`)
    .join("\n");

  const taskRows =
    overview.tasks.length > 0
      ? overview.tasks
          .map(
            (task) =>
              `| ${task.id} | ${task.title} | ${task.requirement ?? "—"} | ${task.complete ? "done" : "open"} |`,
          )
          .join("\n")
      : "| — | — | — | — |";

  const traceRows =
    overview.traceability.length > 0
      ? overview.traceability
          .map((row) => {
            const tasks =
              row.tasks.length > 0 ? row.tasks.join(", ") : "—";
            return `| ${row.reqId} | ${tasks} | ${row.evidence ?? "—"} |`;
          })
          .join("\n")
      : "| — | — | — |";

  const taskSummary = status.tasks
    ? `${status.tasks.complete}/${status.tasks.total} complete (${status.tasks.open} open)`
    : "—";

  return `# Feature overview: ${overview.featureId}

> Generated ${overview.generatedAt}. Refresh with \`feature-overview ${overview.featureId} --write\`.

## Summary

| Field | Value |
| --- | --- |
| Goal | ${overview.goal ?? "—"} |
| Phase | ${status.phase ?? "—"} |
| Branch | ${status.branch ?? "—"} |
| Tasks | ${taskSummary} |
| Validation | ${status.verdict ?? "—"} |
| Next | ${status.next} |

## Artifacts

| Artifact | Status |
| --- | --- |
${artifactRows}

## Tasks

| Task | Title | Requirement | Status |
| --- | --- | --- | --- |
${taskRows}

## Traceability (REQ → task → evidence)

| REQ | Task(s) | Test evidence |
| --- | --- | --- |
${traceRows}

_Evidence rows populate after \`validation.md\` exists. Structural gaps are caught by \`validate-traceability\`._
`;
}

/**
 * @param {string} [featureArg]
 * @param {{ cwd?: string; write?: boolean }} [options]
 */
export async function featureOverview(featureArg, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const overview = await buildFeatureOverview(featureArg, { cwd });
  const markdown = formatFeatureOverview(overview);

  if (options.write) {
    const outPath = path.join(
      featureDir(overview.featureId, cwd),
      "overview.md",
    );
    await fs.writeFile(outPath, markdown, "utf8");
    overview.writtenTo = outPath;
  }

  return overview;
}
