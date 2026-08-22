import path from "node:path";

import { CURSORRULES_BLOCK } from "./agent-contract.js";
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
 * @returns {{ start: number, end: number, begin: string, endMarker: string } | null}
 */
function locateGuardrailsBlock(content) {
  for (const [begin, endMarker] of MARKER_PAIRS) {
    const start = content.indexOf(begin);
    const end = content.indexOf(endMarker);

    if (start !== -1 && end !== -1 && end >= start) {
      return { start, end, begin, endMarker };
    }
  }

  return null;
}

function extractGuardrailsBlock(content) {
  const located = locateGuardrailsBlock(content);
  if (!located) {
    return null;
  }

  return content.slice(located.start, located.end + located.endMarker.length);
}

function replaceGuardrailsBlock(content) {
  const located = locateGuardrailsBlock(content);
  if (!located) {
    return null;
  }

  const before = content.slice(0, located.start);
  const after = content.slice(located.end + located.endMarker.length);
  const trimmedBlock = `${CURSORRULES_BLOCK.trim()}\n`;

  return `${before}${trimmedBlock}${after.replace(/^\n+/, "")}`;
}

export async function injectCursorRules(cwd) {
  const rulesPath = path.join(cwd, ".cursorrules");
  const expectedBlock = CURSORRULES_BLOCK.trim();

  try {
    const existing = await readFileSafe(rulesPath);
    const currentBlock = extractGuardrailsBlock(existing);

    if (currentBlock) {
      if (currentBlock.trim() === expectedBlock) {
        return { created: false, updated: false };
      }

      const replaced = replaceGuardrailsBlock(existing);
      if (replaced === null) {
        throw new Error(`Failed to upgrade guardrails block in ${rulesPath}`);
      }

      await writeFileSafe(rulesPath, replaced.endsWith("\n") ? replaced : `${replaced}\n`);
      return { created: false, updated: true };
    }

    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    await appendFileSafe(rulesPath, `${separator}${CURSORRULES_BLOCK}\n`);
    return { created: false, updated: true };
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  await writeFileSafe(rulesPath, `${CURSORRULES_BLOCK}\n`);
  return { created: true, updated: false };
}
