import { injectAgentsMd } from "./agents-md.js";
import { injectCodexAgents } from "./codex-agents.js";
import { injectCopilotInstructions } from "./copilot-instructions.js";

/**
 * Install shipped platform adapter entry files (Copilot, Codex, AGENTS.md).
 * Cursor and Claude adapters are injected separately in install.js.
 *
 * @param {string} cwd
 */
export async function installPlatformAdapters(cwd) {
  return Promise.all([
    injectCopilotInstructions(cwd),
    injectAgentsMd(cwd),
    injectCodexAgents(cwd),
  ]);
}
