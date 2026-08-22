import path from "node:path";

import {
  CURSORRULES_MARKER_BEGIN,
  CURSORRULES_MARKER_END,
  LEGACY_CURSORRULES_MARKER_PAIRS,
} from "./constants.js";
import {
  appendFileSafe,
  readFileSafe,
  writeFileSafe,
} from "./fs-utils.js";

const MARKER_PAIRS = [
  [CURSORRULES_MARKER_BEGIN, CURSORRULES_MARKER_END],
  ...LEGACY_CURSORRULES_MARKER_PAIRS,
];

/**
 * @param {string} content
 * @returns {{ start: number, end: number, endMarker: string } | null}
 */
function locateBlock(content) {
  for (const [begin, endMarker] of MARKER_PAIRS) {
    const start = content.indexOf(begin);
    const end = content.indexOf(endMarker);
    if (start !== -1 && end !== -1 && end >= start) {
      return { start, end, endMarker };
    }
  }
  return null;
}

/**
 * Install or refresh a markdown file with a marked Spec Guardrails block.
 *
 * @param {string} cwd
 * @param {string} relativePath
 * @param {string} blockContent
 * @returns {Promise<{ created: boolean, updated: boolean }>}
 */
export async function injectMarkedBlock(cwd, relativePath, blockContent) {
  const target = path.join(cwd, relativePath);
  const expected = blockContent.trim();

  try {
    const existing = await readFileSafe(target);
    const located = locateBlock(existing);
    if (located) {
      const current = existing.slice(
        located.start,
        located.end + located.endMarker.length,
      );
      if (current.trim() === expected) {
        return { created: false, updated: false };
      }
      const before = existing.slice(0, located.start);
      const after = existing.slice(located.end + located.endMarker.length);
      const replaced = `${before}${expected}\n${after.replace(/^\n+/, "")}`;
      await writeFileSafe(
        target,
        replaced.endsWith("\n") ? replaced : `${replaced}\n`,
      );
      return { created: false, updated: true };
    }

    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    await appendFileSafe(target, `${separator}${blockContent}\n`);
    return { created: false, updated: true };
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  await writeFileSafe(target, `${blockContent}\n`);
  return { created: true, updated: false };
}
