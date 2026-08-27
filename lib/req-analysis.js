import fs from "node:fs/promises";
import path from "node:path";

import { slugifyDescription } from "./feature.js";
import { ensureDir, writeFileSafe } from "./fs-utils.js";
import { NPX } from "./constants.js";

export const PROJECT_DIR = ".specs/project";
export const KICKOFF_FILENAME = "kickoff.md";
export const PROJECT_BRIEF_FILENAME = "requirements-brief.md";
export const FEATURE_BRIEFS_DIR = "feature-briefs";

/** @type {readonly string[]} */
export const DEFAULT_KICKOFF_DISCOVERY_PATHS = [
  "prd.md",
  "docs/brief.md",
  "docs/prd.md",
  path.join(PROJECT_DIR, KICKOFF_FILENAME),
];

/**
 * @param {string} scope
 * @returns {"project" | "feature"}
 */
export function normalizeScope(scope) {
  const value = (scope ?? "feature").toLowerCase();
  if (value === "project" || value === "feature") {
    return value;
  }
  throw new Error('Scope must be "project" or "feature".');
}

/**
 * @param {"project" | "feature"} scope
 * @param {string} slug
 * @param {string} [description]
 * @returns {string}
 */
export function briefPathForScope(scope, slug, description = "") {
  if (scope === "project") {
    return path.posix.join(PROJECT_DIR, PROJECT_BRIEF_FILENAME);
  }
  const featureSlug = slug || slugifyDescription(description || "feature");
  return path.posix.join(
    PROJECT_DIR,
    FEATURE_BRIEFS_DIR,
    featureSlug,
    PROJECT_BRIEF_FILENAME,
  );
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} cwd
 * @param {string[]} [extraPaths]
 * @returns {Promise<Array<{ path: string, exists: boolean }>>}
 */
export async function discoverKickoffSources(cwd, extraPaths = []) {
  const candidates = [...DEFAULT_KICKOFF_DISCOVERY_PATHS, ...extraPaths];
  const seen = new Set();
  /** @type {Array<{ path: string, exists: boolean }>} */
  const results = [];

  for (const relative of candidates) {
    const normalized = relative.replace(/\\/g, "/");
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const absolute = path.join(cwd, relative);
    let exists = false;
    try {
      await fs.access(absolute);
      exists = true;
    } catch {
      exists = false;
    }
    results.push({ path: normalized, exists });
  }

  return results;
}

/**
 * @param {"project" | "feature"} scope
 * @param {string} description
 * @returns {string}
 */
export function buildBriefTemplate(scope, description) {
  const goal =
    description.trim() || (scope === "project" ? "Project goal" : "Feature goal");

  const featureSection =
    scope === "project"
      ? `
## Feature candidates

| Suggested slug | Goal | Priority |
| --- | --- | --- |
| 001-example | (one line) | P1 |

`
      : "";

  return `# Requirements brief: ${goal}

## Goal

${goal}

## Context sources

- (list every file or chat paste used)

## Current state

- (what exists in repo today — brownfield notes)

## Capabilities

- (product-language outcomes when done)

## Interaction details

- (UI screens/actions or API contracts — or "n/a")

## Constraints & out of scope

- In scope: …
- Out of scope: …

## Resolved questions

### D-001: (question one line)

- **Options considered**: A) … B) …
- **Decision**: …
- **Rationale**: …
- **Date**: YYYY-MM-DD

## Open questions

- none

${featureSection}## Owner approval

- Approved: yes
- Date: YYYY-MM-DD
`;
}

/**
 * @param {string} description
 * @param {{ scope?: string, cwd?: string, force?: boolean }} [options]
 * @returns {Promise<{ scope: "project" | "feature", paths: string[], discovered: Array<{ path: string, exists: boolean }> }>}
 */
export async function reqAnalysisInit(description, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const scope = normalizeScope(options.scope ?? "feature");
  const slug = scope === "feature" ? slugifyDescription(description || "feature") : "";

  if (!description.trim() && scope === "feature") {
    throw new Error(
      'Description is required for feature scope. Example: req-analysis init "settings page" --scope feature',
    );
  }

  const briefPath = briefPathForScope(scope, slug, description);
  const kickoffRel = path.posix.join(PROJECT_DIR, KICKOFF_FILENAME);
  const discovered = await discoverKickoffSources(cwd);

  await ensureDir(path.join(cwd, ...path.dirname(briefPath).split("/")));

  const briefFull = path.join(cwd, ...briefPath.split("/"));
  const briefExists = await pathExists(briefFull);
  if (briefExists && !options.force) {
    throw new Error(
      `${briefPath} already exists — use --force to replace the scaffold`,
    );
  }

  await writeFileSafe(briefFull, buildBriefTemplate(scope, description));

  /** @type {string[]} */
  const paths = [briefPath];

  if (scope === "project") {
    const kickoffFull = path.join(cwd, ...kickoffRel.split("/"));
    const kickoffExists = await pathExists(kickoffFull);
    if (!kickoffExists) {
      await ensureDir(path.join(cwd, PROJECT_DIR));
      await writeFileSafe(
        kickoffFull,
        `# Kickoff brief

(Paste product vision, goals, or export from your notes here.)

## Goal

${description.trim() || "(one sentence — what we are building)"}

## Notes

- 
`,
      );
      paths.push(kickoffRel);
    }
  }

  return { scope, paths, discovered };
}

/**
 * @param {{ scope?: string, briefPath?: string, description?: string }} [options]
 * @returns {string}
 */
export function formatPromoteMessage(options = {}) {
  const scope = normalizeScope(options.scope ?? "feature");

  if (scope === "project") {
    return [
      "Project brief ready — next steps:",
      "  1. Owner approves .specs/project/requirements-brief.md",
      "  2. Update .specs/project/ROADMAP.md with feature candidates",
      `  3. Pick a feature → ${NPX("req-analysis init \"…\" --scope feature")} or /specify`,
      `  4. ${NPX("memory-index rebuild")} — index kickoff + brief`,
    ].join("\n");
  }

  const desc = options.description?.trim() || "feature description";
  return [
    "Feature brief ready — next steps:",
    "  1. Owner approves the requirements brief",
    `  2. ${NPX(`feature-init "${desc}"`)}`,
    "  3. /specify — derive spec.md from brief (do not re-ask resolved questions)",
    `  4. ${NPX("memory-index rebuild")}`,
  ].join("\n");
}

/**
 * @param {string} cwd
 * @returns {Promise<string>}
 */
export async function formatDiscoverReport(cwd) {
  const discovered = await discoverKickoffSources(cwd);
  const lines = ["Kickoff source discovery:", ""];

  for (const entry of discovered) {
    lines.push(`  ${entry.exists ? "[found]" : "[missing]"} ${entry.path}`);
  }

  const found = discovered.filter((entry) => entry.exists);
  if (found.length === 0) {
    lines.push("");
    lines.push(
      "  No kickoff file yet — paste brief in chat or create .specs/project/kickoff.md",
    );
  }

  return lines.join("\n");
}
