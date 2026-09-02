import fs from "node:fs/promises";
import path from "node:path";

import { packagedAssetPath } from "./assets.js";
import { readFileSafe } from "./fs-utils.js";

const HOOK_MARKER = "# Spec Guardrails — optional pre-commit hook";

/**
 * @param {string} cwd
 * @param {{ remove?: boolean }} [options]
 * @returns {Promise<{ path: string, action: "installed" | "removed" | "skipped" }>}
 */
export async function installHooks(cwd = process.cwd(), options = {}) {
  const gitDir = path.join(cwd, ".git");
  try {
    await fs.access(gitDir);
  } catch {
    throw new Error("Not a git repository — run from your project root.");
  }

  const hookPath = path.join(gitDir, "hooks", "pre-commit");

  if (options.remove) {
    try {
      const existing = await fs.readFile(hookPath, "utf8");
      if (!existing.includes(HOOK_MARKER)) {
        return { path: hookPath, action: "skipped" };
      }
      await fs.unlink(hookPath);
      return { path: hookPath, action: "removed" };
    } catch {
      return { path: hookPath, action: "skipped" };
    }
  }

  const template = await readFileSafe(
    packagedAssetPath("templates/hooks/pre-commit"),
  );
  let existing = "";
  try {
    existing = await fs.readFile(hookPath, "utf8");
  } catch {
    // no hook yet
  }

  if (existing && !existing.includes(HOOK_MARKER)) {
    throw new Error(
      `${hookPath} already exists and is not managed by Spec Guardrails. ` +
        "Back it up, then re-run install-hooks or append the template manually.",
    );
  }

  await fs.mkdir(path.dirname(hookPath), { recursive: true });
  await fs.writeFile(hookPath, template, { mode: 0o755 });
  return { path: hookPath, action: "installed" };
}
