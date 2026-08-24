import fs from "node:fs/promises";
import path from "node:path";

import { readFileSafe } from "./fs-utils.js";
import { featureDir, resolveFeatureId } from "./specs-utils.js";
import {
  cleanupWorkspaces,
  listWorkspaces,
  prepareWorkspaces,
  workspacePath,
  WORKSPACES_ROOT,
} from "./workspace-isolation.js";

export const EXPLORATION_FILENAME = "exploration.md";

/** @type {readonly string[]} */
export const COMPARISON_CRITERIA = [
  "Spec compliance",
  "Test results",
  "Complexity",
  "Maintainability",
  "Performance",
  "Risk",
];

/**
 * @param {string} candidateId
 * @returns {string}
 */
export function candidateWorkspaceId(candidateId) {
  return `candidate-${candidateId}`;
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeCandidateId(raw) {
  const cleaned = raw.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/.test(cleaned)) {
    throw new Error(
      `Invalid candidate id "${raw}" (use 1–16 alphanumeric characters, hyphen, or underscore)`,
    );
  }
  return cleaned;
}

/**
 * @param {string} featureId
 * @param {Array<{ id: string, label: string }>} candidates
 * @param {string} cwd
 * @returns {string}
 */
export function buildExplorationMarkdown(featureId, candidates, cwd) {
  const candidateRows = candidates
    .map(({ id, label }) => {
      const workspace = path
        .join(WORKSPACES_ROOT, featureId, candidateWorkspaceId(id))
        .replace(/\\/g, "/");
      return `| ${id} | ${label} | ${workspace} | exploring |`;
    })
    .join("\n");

  const headerCols = candidates.map(({ id }) => id).join(" | ");
  const comparisonRows = COMPARISON_CRITERIA.map(
    (criterion) => `| ${criterion} | ${candidates.map(() => "").join(" | ")} |`,
  ).join("\n");

  return `# Solution Exploration: ${featureId}

## Status

exploring

## Candidates

| Id | Label | Workspace | Status |
| --- | --- | --- | --- |
${candidateRows}

## Comparison

| Criterion | ${headerCols} |
| --- | ${candidates.map(() => "---").join(" | ")} |
${comparisonRows}

## Decision

- **Selected**: (pending)
- **Merged from**: —
- **Rationale**: —
`;
}

/**
 * @param {string} line
 * @returns {string[] | null}
 */
function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || trimmed.includes("---")) {
    return null;
  }
  const cells = trimmed
    .slice(1, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
  return cells.length ? cells : null;
}

/**
 * @param {string} content
 * @param {string} heading
 * @returns {string[]}
 */
function sectionLines(content, heading) {
  const pattern = new RegExp(`^## ${heading}\\s*$`, "m");
  const match = pattern.exec(content);
  if (!match || match.index === undefined) {
    return [];
  }

  const rest = content.slice(match.index + match[0].length);
  const nextHeading = rest.search(/^## /m);
  const body = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return body.split("\n").map((line) => line.trimEnd());
}

/**
 * @param {string} content
 * @returns {{
 *   status: string,
 *   candidates: Array<{ id: string, label: string, workspace: string, status: string }>,
 *   comparison: Record<string, Record<string, string>>,
 *   decision: { selected: string | null, mergedFrom: string | null, rationale: string | null },
 * }}
 */
export function parseExplorationMarkdown(content) {
  const statusLines = sectionLines(content, "Status");
  const status = statusLines.find((line) => line && !line.startsWith("#"))?.trim() ?? "";

  /** @type {Array<{ id: string, label: string, workspace: string, status: string }>} */
  const candidates = [];
  for (const line of sectionLines(content, "Candidates")) {
    const cells = parseTableRow(line);
    if (!cells || cells[0] === "Id") {
      continue;
    }
    if (cells.length >= 4) {
      candidates.push({
        id: cells[0],
        label: cells[1],
        workspace: cells[2],
        status: cells[3],
      });
    }
  }

  /** @type {Record<string, Record<string, string>>} */
  const comparison = {};
  let comparisonHeaders = [];

  for (const line of sectionLines(content, "Comparison")) {
    const cells = parseTableRow(line);
    if (!cells) {
      continue;
    }
    if (cells[0] === "Criterion") {
      comparisonHeaders = cells.slice(1);
      continue;
    }
    const criterion = cells[0];
    comparison[criterion] = {};
    for (let i = 0; i < comparisonHeaders.length; i++) {
      comparison[criterion][comparisonHeaders[i]] = cells[i + 1] ?? "";
    }
  }

  const decisionLines = sectionLines(content, "Decision");
  const decisionText = decisionLines.join("\n");
  const selectedMatch = decisionText.match(/\*\*Selected\*\*:\s*(.+)/);
  const mergedMatch = decisionText.match(/\*\*Merged from\*\*:\s*(.+)/);
  const rationaleMatch = decisionText.match(/\*\*Rationale\*\*:\s*(.+)/);

  const selectedRaw = selectedMatch?.[1]?.trim() ?? "";
  const mergedRaw = mergedMatch?.[1]?.trim() ?? "";
  const rationaleRaw = rationaleMatch?.[1]?.trim() ?? "";

  return {
    status,
    candidates,
    comparison,
    decision: {
      selected:
        !selectedRaw || /^\(pending\)|—|-$/i.test(selectedRaw) ? null : selectedRaw,
      mergedFrom: !mergedRaw || /^—|-$/i.test(mergedRaw) ? null : mergedRaw,
      rationale: !rationaleRaw || /^—|-$/i.test(rationaleRaw) ? null : rationaleRaw,
    },
  };
}

/**
 * @param {ReturnType<typeof parseExplorationMarkdown>} parsed
 * @param {{ requireDecision?: boolean, allowDecided?: boolean }} [options]
 * @returns {{ ok: boolean, severity: "blocking" | "warning", messages: string[] }}
 */
export function validateExploration(parsed, options = {}) {
  const messages = [];

  if (parsed.candidates.length < 2) {
    messages.push("At least two candidates are required for solution exploration");
  }

  const candidateIds = parsed.candidates.map((item) => item.id);

  for (const criterion of COMPARISON_CRITERIA) {
    const row = parsed.comparison[criterion] ?? {};
    for (const id of candidateIds) {
      const value = (row[id] ?? "").trim();
      if (!value) {
        messages.push(`Comparison missing ${criterion} for candidate ${id}`);
      }
    }
  }

  if (options.requireDecision) {
    if (!parsed.decision.selected) {
      messages.push("Decision must name a selected candidate");
    }
    if (!parsed.decision.rationale) {
      messages.push("Decision must include a rationale");
    }
  } else if (!options.allowDecided && parsed.decision.selected) {
    messages.push("Exploration is already decided — create a new feature to explore again");
  }

  return {
    ok: messages.length === 0,
    severity: "blocking",
    messages,
  };
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @returns {Promise<string>}
 */
async function readExplorationFile(cwd, featureId) {
  const explorationPath = path.join(featureDir(featureId, cwd), EXPLORATION_FILENAME);
  return readFileSafe(explorationPath);
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @param {Array<{ id: string, label?: string }>} candidateSpecs
 * @param {{ baseRef?: string, force?: boolean }} [options]
 */
export async function initExploration(cwd, featureId, candidateSpecs, options = {}) {
  const resolvedId = await resolveFeatureId(featureId, cwd);
  const dir = featureDir(resolvedId, cwd);
  const specPath = path.join(dir, "spec.md");
  const explorationPath = path.join(dir, EXPLORATION_FILENAME);

  try {
    await readFileSafe(specPath);
  } catch {
    throw new Error(`Approved spec required before exploration: ${specPath} not found`);
  }

  if (!options.force) {
    try {
      await fs.access(explorationPath);
      throw new Error(
        `${EXPLORATION_FILENAME} already exists for ${resolvedId} (use --force to replace)`,
      );
    } catch (err) {
      if (!(err instanceof Error) || !("code" in err) || err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  if (candidateSpecs.length < 2) {
    throw new Error("At least two candidates are required (e.g. --candidates A,B)");
  }

  /** @type {Array<{ id: string, label: string }>} */
  const candidates = candidateSpecs.map((spec, index) => {
    const id = normalizeCandidateId(spec.id);
    const label = spec.label?.trim() || `Candidate ${id}`;
    return { id, label };
  });

  const ids = candidates.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Candidate ids must be unique");
  }

  const markdown = buildExplorationMarkdown(resolvedId, candidates, cwd);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(explorationPath, markdown, "utf8");

  const workspaceIds = candidates.map(({ id }) => candidateWorkspaceId(id));
  const workspaces = await prepareWorkspaces(cwd, {
    featureId: resolvedId,
    taskIds: workspaceIds,
    baseRef: options.baseRef ?? "HEAD",
  });

  return {
    featureId: resolvedId,
    explorationPath,
    candidates,
    workspaces,
  };
}

/**
 * @param {string} cwd
 * @param {string} [featureId]
 */
export async function getExplorationStatus(cwd, featureId) {
  const resolvedId = await resolveFeatureId(featureId, cwd);
  const content = await readExplorationFile(cwd, resolvedId);
  const parsed = parseExplorationMarkdown(content);
  const workspaces = await listWorkspaces(cwd, resolvedId);
  const candidateWorkspaces = workspaces.filter((item) => item.taskId.startsWith("candidate-"));

  return {
    featureId: resolvedId,
    ...parsed,
    workspaces: candidateWorkspaces,
  };
}

/**
 * @param {string} cwd
 * @param {string} featureId
 */
export async function validateExplorationArtifact(cwd, featureId) {
  const resolvedId = await resolveFeatureId(featureId, cwd);
  const content = await readExplorationFile(cwd, resolvedId);
  const parsed = parseExplorationMarkdown(content);
  const result = validateExploration(parsed, { requireDecision: false });

  return {
    featureId: resolvedId,
    ...parsed,
    ...result,
  };
}

/**
 * @param {string} content
 * @param {{ selected: string, mergedFrom?: string | null, rationale: string }} decision
 * @returns {string}
 */
export function applyDecisionToMarkdown(content, decision) {
  let updated = content.replace(
    /^## Status\s*\n\s*\S+/m,
    "## Status\n\ndecided",
  );

  updated = updated.replace(
    /\*\*Selected\*\*:\s*.+/,
    `**Selected**: ${decision.selected}`,
  );
  updated = updated.replace(
    /\*\*Merged from\*\*:\s*.+/,
    `**Merged from**: ${decision.mergedFrom ?? "—"}`,
  );
  updated = updated.replace(
    /\*\*Rationale\*\*:\s*.+/,
    `**Rationale**: ${decision.rationale}`,
  );

  return updated;
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @param {{ selected: string, mergedFrom?: string | null, rationale: string, cleanup?: boolean }} decision
 */
export async function recordExplorationDecision(cwd, featureId, decision) {
  const resolvedId = await resolveFeatureId(featureId, cwd);
  const explorationPath = path.join(featureDir(resolvedId, cwd), EXPLORATION_FILENAME);
  const content = await readExplorationFile(cwd, resolvedId);
  const parsed = parseExplorationMarkdown(content);

  const selected = normalizeCandidateId(decision.selected);
  const candidateIds = new Set(parsed.candidates.map((item) => item.id));
  if (!candidateIds.has(selected)) {
    throw new Error(`Unknown candidate "${selected}" — expected one of: ${[...candidateIds].join(", ")}`);
  }

  let mergedFrom = decision.mergedFrom?.trim() || null;
  if (mergedFrom) {
    mergedFrom = normalizeCandidateId(mergedFrom);
    if (!candidateIds.has(mergedFrom)) {
      throw new Error(`Unknown merge candidate "${mergedFrom}"`);
    }
  }

  const rationale = decision.rationale?.trim();
  if (!rationale) {
    throw new Error("Decision requires --rationale");
  }

  const comparisonCheck = validateExploration(parsed, { allowDecided: true });
  if (!comparisonCheck.ok) {
    throw new Error(comparisonCheck.messages.join("; "));
  }

  if (parsed.decision.selected) {
    throw new Error("Exploration is already decided");
  }

  const updated = applyDecisionToMarkdown(content, {
    selected,
    mergedFrom,
    rationale,
  });
  await fs.writeFile(explorationPath, updated, "utf8");

  /** @type {Awaited<ReturnType<typeof cleanupWorkspaces>> | null} */
  let cleanup = null;
  if (decision.cleanup) {
    const keep = new Set([candidateWorkspaceId(selected)]);
    if (mergedFrom) {
      keep.add(candidateWorkspaceId(mergedFrom));
    }
    const removeIds = parsed.candidates
      .map((item) => candidateWorkspaceId(item.id))
      .filter((workspaceId) => !keep.has(workspaceId));
    if (removeIds.length) {
      cleanup = await cleanupWorkspaces(cwd, {
        featureId: resolvedId,
        taskIds: removeIds,
        force: true,
      });
    }
  }

  return {
    featureId: resolvedId,
    selected,
    mergedFrom,
    rationale,
    cleanup,
  };
}

/**
 * @param {Awaited<ReturnType<typeof getExplorationStatus>>} status
 * @param {{ json?: boolean }} [options]
 */
export function formatExplorationStatus(status, options = {}) {
  if (options.json) {
    return `${JSON.stringify(status, null, 2)}\n`;
  }

  const lines = [
    `Solution exploration: ${status.featureId}`,
    `  Status: ${status.status || "(unset)"}`,
    "  Candidates:",
  ];

  if (!status.candidates.length) {
    lines.push("    (none)");
  } else {
    for (const candidate of status.candidates) {
      lines.push(`    ${candidate.id}: ${candidate.label} (${candidate.status})`);
    }
  }

  if (status.decision.selected) {
    lines.push(`  Decision: ${status.decision.selected}`);
    if (status.decision.mergedFrom) {
      lines.push(`  Merged from: ${status.decision.mergedFrom}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

/**
 * @param {{ ok: boolean, messages: string[], featureId: string }} result
 * @param {{ json?: boolean }} [options]
 */
export function formatExplorationValidation(result, options = {}) {
  if (options.json) {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  const label = result.ok ? "PASS" : "FAIL";
  const lines = [`[solution-explore] ${label} - ${result.featureId}`];
  for (const message of result.messages) {
    lines.push(`  ${message}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {Awaited<ReturnType<typeof initExploration>>} result
 * @param {{ json?: boolean }} [options]
 */
export function formatExplorationInit(result, options = {}) {
  if (options.json) {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  const lines = [
    `Initialized exploration for ${result.featureId}`,
    `  Artifact: ${result.explorationPath}`,
    "  Candidates:",
  ];
  for (const candidate of result.candidates) {
    const workspace = workspacePath(process.cwd(), result.featureId, candidateWorkspaceId(candidate.id));
    lines.push(`    ${candidate.id}: ${candidate.label} → ${workspace}`);
  }
  for (const workspace of result.workspaces) {
    lines.push(`  Workspace ${workspace.taskId}: ${workspace.status}`);
  }
  return `${lines.join("\n")}\n`;
}
