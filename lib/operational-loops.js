import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readFileSafe } from "./fs-utils.js";
import { NPX } from "./constants.js";

const PACKAGE_ROOT = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);

export const LOOPS_CATALOG_PATH = path.join(
  PACKAGE_ROOT,
  "templates/loops/catalog.json",
);

/**
 * @typedef {object} LoopPattern
 * @property {string} title
 * @property {string} tier
 * @property {string} cadence
 * @property {string} posture
 * @property {string} description
 * @property {string[]} constraints
 * @property {string[]} stop_rules
 * @property {string[]} suggested_steps
 */

/**
 * @returns {Promise<Record<string, LoopPattern>>}
 */
export async function loadLoopCatalog() {
  const raw = await readFileSafe(LOOPS_CATALOG_PATH);
  const parsed = JSON.parse(raw);
  return parsed.patterns ?? {};
}

/**
 * @returns {Promise<string[]>}
 */
export async function listLoopPatterns() {
  const patterns = await loadLoopCatalog();
  return Object.keys(patterns).sort();
}

/**
 * @param {string} id
 * @returns {Promise<LoopPattern | null>}
 */
export async function getLoopPattern(id) {
  const patterns = await loadLoopCatalog();
  return patterns[id] ?? null;
}

/**
 * @param {string} id
 * @param {LoopPattern} pattern
 * @returns {string}
 */
export function formatLoopPattern(id, pattern) {
  const lines = [
    `${pattern.title} (${id})`,
    `Tier: ${pattern.tier} · Cadence: ${pattern.cadence}`,
    "",
    pattern.description,
    "",
    `Posture: ${pattern.posture}`,
    "",
    "Constraints:",
    ...pattern.constraints.map((item) => `  - ${item}`),
    "",
    "Stop rules:",
    ...pattern.stop_rules.map((item) => `  - ${item}`),
    "",
    "Suggested steps:",
    ...pattern.suggested_steps.map((item) => `  - ${item}`),
  ];
  return lines.join("\n");
}

/**
 * @param {string} id
 * @param {LoopPattern} pattern
 * @param {{ dryRun?: boolean }} [options]
 * @returns {string}
 */
export function formatLoopRunBrief(id, pattern, options = {}) {
  const prefix = options.dryRun ? "[dry-run] " : "";
  const lines = [
    `${prefix}Operational loop: ${pattern.title} (${id})`,
    "",
    "This command prints a structured brief for the agent — it does not run automation.",
    "",
    formatLoopPattern(id, pattern),
    "",
    "Harness hooks:",
    `  ${NPX("doctor")}`,
    `  ${NPX(`classify-change "${pattern.title}"`)}`,
    "",
    "Feature work still uses: feature-init → Specify → Tasks → loop-plan → Verify.",
    "See docs/guide/loop-patterns.md for combining operational and feature loops.",
  ];
  return lines.join("\n");
}

/**
 * @param {Record<string, LoopPattern>} patterns
 * @returns {object}
 */
export function formatLoopListJson(patterns) {
  return {
    patterns: Object.entries(patterns).map(([id, pattern]) => ({
      id,
      title: pattern.title,
      tier: pattern.tier,
      cadence: pattern.cadence,
    })),
  };
}
