import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { packagedAssetPath } from "./assets.js";
import { readFileSafe } from "./fs-utils.js";

const execFileAsync = promisify(execFile);

const NOT_A_REPO = "Not a git repository — run from your project root.";

/** @type {Array<{ name: string, template: string, marker: string }>} */
const MANAGED_HOOKS = [
  {
    name: "pre-commit",
    template: "templates/hooks/pre-commit",
    marker: "# Spec Guardrails — optional pre-commit hook",
  },
  {
    name: "commit-msg",
    template: "templates/hooks/commit-msg",
    marker: "# Spec Guardrails — optional commit-msg hook",
  },
];

/**
 * Hooks directory for this checkout.
 * `git rev-parse --git-path hooks` follows linked worktrees (where `.git` is a
 * file) and `core.hooksPath`. Joining `.git/hooks` does neither.
 *
 * @param {string} cwd
 * @returns {Promise<string>}
 */
async function resolveHooksDir(cwd) {
  let hooksPath = "";
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--git-path", "hooks"],
      { cwd, encoding: "utf8" },
    );
    hooksPath = stdout.trim();
  } catch (err) {
    if (err && err.code === "ENOENT") {
      throw new Error("git is not available on PATH.");
    }
    throw new Error(NOT_A_REPO);
  }

  if (!hooksPath) {
    throw new Error(NOT_A_REPO);
  }

  return path.resolve(cwd, hooksPath);
}

/**
 * @param {string} hookPath
 * @returns {Promise<string>}
 */
async function readHook(hookPath) {
  try {
    return await fs.readFile(hookPath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return "";
    }
    throw err;
  }
}

/**
 * @param {{ name: string, path: string, marker: string }} target
 * @returns {Promise<{ name: string, path: string, action: "removed" | "skipped" }>}
 */
async function removeManagedHook(target) {
  const existing = await readHook(target.path);
  if (!existing || !existing.includes(target.marker)) {
    return { name: target.name, path: target.path, action: "skipped" };
  }
  await fs.unlink(target.path);
  return { name: target.name, path: target.path, action: "removed" };
}

/**
 * @param {string} cwd
 * @param {{ remove?: boolean }} [options]
 * @returns {Promise<{
 *   path: string,
 *   action: "installed" | "removed" | "skipped",
 *   hooks: Array<{ name: string, path: string, action: "installed" | "removed" | "skipped" }>
 * }>}
 */
export async function installHooks(cwd = process.cwd(), options = {}) {
  const hooksDir = await resolveHooksDir(cwd);
  const targets = MANAGED_HOOKS.map((hook) => ({
    ...hook,
    path: path.join(hooksDir, hook.name),
  }));

  if (options.remove) {
    const hooks = [];
    for (const target of targets) {
      hooks.push(await removeManagedHook(target));
    }
    const action = hooks.some((hook) => hook.action === "removed")
      ? "removed"
      : "skipped";
    return { path: targets[0].path, action, hooks };
  }

  for (const target of targets) {
    const existing = await readHook(target.path);
    if (existing && !existing.includes(target.marker)) {
      throw new Error(
        `${target.path} already exists and is not managed by Spec Guardrails. ` +
          "Back it up, then re-run install-hooks or append the template manually.",
      );
    }
  }

  await fs.mkdir(hooksDir, { recursive: true });

  const hooks = [];
  for (const target of targets) {
    const template = await readFileSafe(packagedAssetPath(target.template));
    await fs.writeFile(target.path, template, { mode: 0o755 });
    hooks.push({ name: target.name, path: target.path, action: "installed" });
  }

  return { path: targets[0].path, action: "installed", hooks };
}
