import { buildExecutionContractBlock } from "./agent-contract.js";
import { injectMarkedBlock } from "./marked-inject.js";

export const COPILOT_INSTRUCTIONS_BLOCK = buildExecutionContractBlock({
  skillPrefix: ".github/skills",
  footerLines: [
    "GitHub Copilot reads this file as repository custom instructions.",
    "Cursor and Claude Code use their own adapter entry files — see Platform-parity.md in the package repo.",
  ],
});

/**
 * Install or refresh `.github/copilot-instructions.md` for GitHub Copilot.
 *
 * @param {string} cwd
 */
export async function injectCopilotInstructions(cwd) {
  return injectMarkedBlock(
    cwd,
    ".github/copilot-instructions.md",
    COPILOT_INSTRUCTIONS_BLOCK,
  );
}
