import fs from "node:fs/promises";
import path from "node:path";

export const COMPANIONS_DIR = ".specs/companions";

export const COMPANIONS_INDEX_FILE = "INDEX.json";

export const ATLAS_SCHEMA_VERSION = "1.0.0";

/**
 * @typedef {{
 *   id: string,
 *   npm: string,
 *   version: string,
 *   displayName: string,
 *   scriptsDir: string,
 *   gates: string[],
 *   projectSection: string,
 *   ruleFile: string,
 *   preservePaths: string[],
 * }} CompanionIndexEntry
 */

/**
 * @typedef {{
 *   schemaVersion: string,
 *   generatedAt: string,
 *   paired: boolean,
 *   companions: CompanionIndexEntry[],
 * }} CompanionsIndex
 */

/**
 * @param {string} cwd
 * @returns {string}
 */
export function companionsIndexPath(cwd) {
  return path.join(cwd, COMPANIONS_DIR, COMPANIONS_INDEX_FILE);
}

/**
 * @param {string} cwd
 * @returns {Promise<CompanionsIndex | null>}
 */
export async function readCompanionsIndex(cwd) {
  try {
    const raw = await fs.readFile(companionsIndexPath(cwd), "utf8");
    return /** @type {CompanionsIndex} */ (JSON.parse(raw));
  } catch (err) {
    if (err && /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Collect preserve paths from all registered Atlas companions.
 * Falls back to known Tech Atlas 0.5 paths when INDEX is absent.
 *
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
export async function collectCompanionPreservePaths(cwd) {
  const index = await readCompanionsIndex(cwd);
  if (!index) {
    return [
      ".specs/tech-atlas",
      ".specs/atlas",
      ".specs/desks",
      ".specs/companions",
    ];
  }

  const paths = new Set();
  for (const companion of index.companions) {
    for (const preservePath of companion.preservePaths) {
      paths.add(preservePath);
    }
    for (const gate of companion.gates) {
      paths.add(path.posix.join(companion.scriptsDir, gate));
    }
    paths.add(companion.scriptsDir);
    paths.add(path.dirname(companion.ruleFile));
  }
  paths.add(COMPANIONS_DIR);
  return [...paths];
}

/**
 * @param {string} cwd
 * @returns {Promise<CompanionIndexEntry[]>}
 */
export async function listInstalledCompanions(cwd) {
  const index = await readCompanionsIndex(cwd);
  return index?.companions ?? [];
}
