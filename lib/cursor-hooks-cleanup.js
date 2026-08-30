import fs from "node:fs/promises";
import path from "node:path";

import { readFileSafe } from "./fs-utils.js";

export const CURSOR_HOOK_EDIT = ".cursor/hooks/context-guard-edit.mjs";
export const CURSOR_HOOK_SANDBOX = ".cursor/hooks/sandbox-shell.mjs";
export const CURSOR_HOOKS_JSON = ".cursor/hooks.json";

/** @type {readonly string[]} */
const SHIPPED_HOOK_SCRIPTS = [CURSOR_HOOK_EDIT, CURSOR_HOOK_SANDBOX];

/** @type {Set<string>} */
const SHIPPED_HOOK_COMMANDS = new Set(SHIPPED_HOOK_SCRIPTS);

/**
 * @param {unknown} hooks
 * @returns {boolean}
 */
function hooksObjectHasShippedEntries(hooks) {
  if (!hooks || typeof hooks !== "object") {
    return false;
  }

  for (const entries of Object.values(hooks)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    if (entries.some((entry) => SHIPPED_HOOK_COMMANDS.has(/** @type {{ command?: string }} */ (entry).command))) {
      return true;
    }
  }

  return false;
}

/**
 * @param {unknown} hooks
 * @returns {boolean}
 */
function hooksObjectHasUserEntries(hooks) {
  if (!hooks || typeof hooks !== "object") {
    return false;
  }

  for (const entries of Object.values(hooks)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    if (
      entries.some(
        (entry) =>
          /** @type {{ command?: string }} */ (entry).command &&
          !SHIPPED_HOOK_COMMANDS.has(/** @type {{ command?: string }} */ (entry).command),
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the `cursor:` block from `.specs/config.yaml` when present.
 *
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
async function removeCursorBlockFromConfig(cwd) {
  const configPath = path.join(cwd, ".specs/config.yaml");
  let text;
  try {
    text = await readFileSafe(configPath);
  } catch {
    return false;
  }

  if (!/^cursor:/m.test(text)) {
    return false;
  }

  text = text.replace(/^cursor:\s*\n(?:[ \t#].*\n)*/m, "");
  text = `${text.replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  await fs.writeFile(configPath, text, "utf8");
  return true;
}

/**
 * Remove legacy Cursor IDE hook artifacts shipped before 4.3.0.
 * Idempotent and silent when nothing remains to clean.
 *
 * @param {string} cwd
 * @param {{ log?: (message: string) => void }} [options]
 * @returns {Promise<{ changed: boolean }>}
 */
export async function cleanupLegacyCursorHooks(cwd, options = {}) {
  const log = options.log ?? (() => {});
  let changed = false;

  for (const script of SHIPPED_HOOK_SCRIPTS) {
    const scriptPath = path.join(cwd, script);
    if (await fileExists(scriptPath)) {
      await fs.unlink(scriptPath);
      changed = true;
    }
  }

  const hooksJsonPath = path.join(cwd, CURSOR_HOOKS_JSON);
  if (await fileExists(hooksJsonPath)) {
    try {
      const existing = JSON.parse(await readFileSafe(hooksJsonPath));
      const hadShipped = hooksObjectHasShippedEntries(existing.hooks);

      if (existing.hooks && typeof existing.hooks === "object") {
        for (const [event, entries] of Object.entries(existing.hooks)) {
          if (!Array.isArray(entries)) {
            continue;
          }
          existing.hooks[event] = entries.filter(
            (entry) => !SHIPPED_HOOK_COMMANDS.has(/** @type {{ command?: string }} */ (entry).command),
          );
        }
      }

      const userHooksRemain = hooksObjectHasUserEntries(existing.hooks);
      const isEffectivelyEmpty =
        !existing.hooks ||
        Object.values(existing.hooks).every(
          (entries) => !Array.isArray(entries) || entries.length === 0,
        );

      if (hadShipped || isEffectivelyEmpty) {
        changed = true;
        if (userHooksRemain) {
          await fs.writeFile(hooksJsonPath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
        } else {
          await fs.unlink(hooksJsonPath);
        }
      }
    } catch {
      await fs.unlink(hooksJsonPath);
      changed = true;
    }
  }

  if (await removeCursorBlockFromConfig(cwd)) {
    changed = true;
  }

  if (changed) {
    log(
      "ℹ️  Cursor IDE hooks removed (deprecated in 4.3.0). " +
        "Scope and sandbox checks remain available via context-guard and sandbox CLI commands.",
    );
  }

  return { changed };
}
