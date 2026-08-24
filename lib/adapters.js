import { installAllAdapters } from "./adapter-registry.js";

/**
 * Install shipped platform adapter entry files (Copilot, Codex, AGENTS.md).
 * Cursor and Claude adapters are injected via the same registry during install.
 *
 * @param {string} cwd
 */
export async function installPlatformAdapters(cwd) {
  return installAllAdapters(cwd);
}
