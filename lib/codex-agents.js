import { buildExecutionContractBlock } from "./agent-contract.js";
import { injectMarkedBlock } from "./marked-inject.js";

export const CODEX_AGENTS_BLOCK = buildExecutionContractBlock({
  skillPrefix: ".codex/skills",
  footerLines: [
    "OpenAI Codex adapter — skills under `.codex/skills/`.",
    "Root `AGENTS.md` and other platform files may also be present — use the tree your Codex session loads.",
  ],
});

/**
 * Install or refresh `.codex/AGENTS.md` for OpenAI Codex.
 *
 * @param {string} cwd
 */
export async function injectCodexAgents(cwd) {
  return injectMarkedBlock(cwd, ".codex/AGENTS.md", CODEX_AGENTS_BLOCK);
}
