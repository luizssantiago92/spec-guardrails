import fs from "node:fs/promises";
import path from "node:path";

import { packagedAssetPath } from "./assets.js";
import { ensureDir, readFileSafe } from "./fs-utils.js";

export const CURSOR_HOOK_SCRIPT = ".cursor/hooks/context-guard-edit.mjs";
export const CURSOR_HOOKS_JSON = ".cursor/hooks.json";

/**
 * Merge shipped hook entries without removing user hooks.
 *
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} template
 * @returns {Record<string, unknown>}
 */
export function mergeCursorHooksConfig(existing, template) {
  /** @type {Record<string, unknown>} */
  const result =
    existing && typeof existing === "object"
      ? structuredClone(existing)
      : { version: 1, hooks: {} };

  result.version = result.version ?? template.version ?? 1;
  /** @type {Record<string, unknown[]>} */
  const hooks =
    result.hooks && typeof result.hooks === "object"
      ? /** @type {Record<string, unknown[]>} */ (result.hooks)
      : {};
  result.hooks = hooks;

  /** @type {Record<string, unknown[]>} */
  const templateHooks =
    template.hooks && typeof template.hooks === "object"
      ? /** @type {Record<string, unknown[]>} */ (template.hooks)
      : {};

  for (const [event, entries] of Object.entries(templateHooks)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    const current = Array.isArray(hooks[event]) ? [...hooks[event]] : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const command = /** @type {{ command?: string }} */ (entry).command;
      if (!command || current.some((item) => item?.command === command)) {
        continue;
      }
      current.push(entry);
    }
    hooks[event] = current;
  }

  return result;
}

/**
 * Install Cursor hooks that auto-run context-guard before write/edit tools.
 *
 * @param {string} cwd
 * @param {{ log?: (message: string) => void }} [options]
 */
export async function installCursorHooks(cwd, options = {}) {
  const log = options.log ?? (() => {});
  const hooksDir = path.join(cwd, ".cursor/hooks");
  await ensureDir(hooksDir);

  const scriptSource = packagedAssetPath("templates/cursor/hooks/context-guard-edit.mjs");
  const scriptDest = path.join(cwd, CURSOR_HOOK_SCRIPT);
  await fs.copyFile(scriptSource, scriptDest);

  try {
    await fs.chmod(scriptDest, 0o755);
  } catch {
    // Windows may ignore chmod; node can still execute the script.
  }

  const template = JSON.parse(
    await readFileSafe(packagedAssetPath("templates/cursor/hooks.json")),
  );

  const hooksJsonPath = path.join(cwd, CURSOR_HOOKS_JSON);
  let existing = null;
  try {
    existing = JSON.parse(await readFileSafe(hooksJsonPath));
  } catch {
    existing = null;
  }

  const merged = mergeCursorHooksConfig(existing, template);
  await fs.writeFile(hooksJsonPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  log(`✅ Cursor hooks → ${CURSOR_HOOKS_JSON} (context-guard on write/edit tools)`);
}
