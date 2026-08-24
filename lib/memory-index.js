import path from "node:path";

import { GUARDRAILS_SCRIPTS_DIR } from "./constants.js";
import { runGuardrailsScript } from "./gates.js";

export const MEMORY_DB_PATH = ".specs/memory/memory.db";

/**
 * Rebuild the SQLite memory index from `.specs/` markdown artifacts.
 *
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<number>} exit code
 */
export async function rebuildMemoryIndex(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  return runGuardrailsScript("memory-index", ["rebuild"], { cwd });
}

/**
 * Build optional semantic embeddings for indexed chunks.
 *
 * @param {{ force?: boolean, json?: boolean, cwd?: string }} [options]
 * @returns {Promise<number>} exit code
 */
export async function embedMemoryIndex(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const args = ["embed"];
  if (options.force) {
    args.push("--force");
  }
  if (options.json) {
    args.push("--json");
  }
  return runGuardrailsScript("memory-index", args, { cwd });
}

/**
 * Hybrid retrieval over indexed artifacts.
 *
 * @param {{ query: string, mode?: string, json?: boolean, cwd?: string }} options
 * @returns {Promise<number>} exit code
 */
export async function retrieveMemory(options) {
  const cwd = options.cwd ?? process.cwd();
  const args = [options.query];
  if (options.mode) {
    args.push("--mode", options.mode);
  }
  if (options.json) {
    args.push("--json");
  }
  return runGuardrailsScript("memory-retrieve", args, { cwd });
}

/**
 * Query the knowledge graph for a bounded context package.
 *
 * @param {{ from: string, depth?: number, json?: boolean, cwd?: string }} options
 * @returns {Promise<number>} exit code
 */
export async function queryMemory(options) {
  const cwd = options.cwd ?? process.cwd();
  const args = ["--from", options.from];
  if (options.depth !== undefined) {
    args.push("--depth", String(options.depth));
  }
  if (options.json) {
    args.push("--json");
  }
  return runGuardrailsScript("memory-query", args, { cwd });
}

/**
 * @param {string} [cwd]
 * @returns {string}
 */
export function memoryDbPath(cwd = process.cwd()) {
  return path.join(cwd, MEMORY_DB_PATH);
}

/**
 * @returns {string}
 */
export function memoryDbRelativePath() {
  return MEMORY_DB_PATH;
}

/**
 * Relative scripts directory for memory tooling diagnostics.
 *
 * @returns {string}
 */
export function memoryScriptsDir() {
  return GUARDRAILS_SCRIPTS_DIR;
}
