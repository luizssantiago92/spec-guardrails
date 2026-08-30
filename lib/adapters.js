import { installAdapters, installAllAdapters } from "./adapter-registry.js";

/**
 * Install shipped platform adapter entry files (Copilot, Codex, AGENTS.md).
 * Cursor and Claude adapters are injected via the same registry during install.
 *
 * @param {string} cwd
 * @param {{ adapterIds?: string[] }} [options]
 */
export async function installPlatformAdapters(cwd, options = {}) {
  if (options.adapterIds) {
    return installAdapters(cwd, options.adapterIds);
  }
  return installAllAdapters(cwd);
}
