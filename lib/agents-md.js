import { buildExecutionContractBlock } from "./agent-contract.js";
import { injectMarkedBlock } from "./marked-inject.js";

export const AGENTS_MD_BLOCK = buildExecutionContractBlock({
  skillPrefix: ".github/skills",
  footerLines: [
    "Agent-agnostic entry (`AGENTS.md` open standard). Prefer the skills tree your tool loads:",
    "- GitHub Copilot → `.github/skills/`",
    "- OpenAI Codex → `.codex/skills/` (see `.codex/AGENTS.md`)",
    "- Cursor → `.cursor/skills/` | Claude Code → `.claude/skills/`",
  ],
});

/**
 * Install or refresh root `AGENTS.md` for Codex and other agents that read it.
 *
 * @param {string} cwd
 */
export async function injectAgentsMd(cwd) {
  return injectMarkedBlock(cwd, "AGENTS.md", AGENTS_MD_BLOCK);
}
