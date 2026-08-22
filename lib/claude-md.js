import { CLAUDE_MD_BLOCK } from "./agent-contract.js";
import { injectMarkedBlock } from "./marked-inject.js";
import {
  CURSORRULES_MARKER_BEGIN,
  CURSORRULES_MARKER_END,
} from "./constants.js";

export const CLAUDE_MD_MARKER_BEGIN = CURSORRULES_MARKER_BEGIN;
export const CLAUDE_MD_MARKER_END = CURSORRULES_MARKER_END;

export { CLAUDE_MD_BLOCK };

/**
 * Install or refresh `.claude/CLAUDE.md` with the Spec Guardrails contract.
 *
 * @param {string} cwd
 */
export async function injectClaudeMd(cwd) {
  return injectMarkedBlock(cwd, ".claude/CLAUDE.md", CLAUDE_MD_BLOCK);
}
