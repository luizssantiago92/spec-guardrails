import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const WORKSPACES_ROOT = ".specs/workspaces";

/**
 * @param {string} cwd
 * @param {string} featureId
 * @param {string} taskId
 * @returns {string}
 */
export function workspacePath(cwd, featureId, taskId) {
  return path.join(cwd, WORKSPACES_ROOT, featureId, taskId);
}

/**
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
export async function isGitRepository(cwd) {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @returns {Promise<string[]>}
 */
export async function listWorkspacePaths(cwd, featureId) {
  const base = path.join(cwd, WORKSPACES_ROOT, featureId);
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(base, entry.name));
  } catch {
    return [];
  }
}

/**
 * Create isolated git worktrees for parallel Execute tasks.
 *
 * @param {string} cwd
 * @param {{ featureId: string, taskIds: string[], baseRef?: string }} options
 * @returns {Promise<Array<{ taskId: string, path: string, branch?: string, status: string, error?: string }>>}
 */
export async function prepareWorkspaces(cwd, { featureId, taskIds, baseRef = "HEAD" }) {
  if (!(await isGitRepository(cwd))) {
    throw new Error("workspace-prepare requires a git repository");
  }

  if (!taskIds.length) {
    throw new Error("workspace-prepare requires at least one task id (e.g. T1,T2)");
  }

  /** @type {Array<{ taskId: string, path: string, branch?: string, status: string, error?: string }>} */
  const results = [];

  for (const taskId of taskIds) {
    const wtPath = workspacePath(cwd, featureId, taskId);
    await fs.mkdir(path.dirname(wtPath), { recursive: true });

    try {
      await fs.access(wtPath);
      results.push({ taskId, path: wtPath, status: "exists" });
      continue;
    } catch {
      // create new worktree
    }

    const branchName = `guardrails/ws-${featureId}-${taskId}`;
    try {
      await execFileAsync(
        "git",
        ["worktree", "add", "-B", branchName, wtPath, baseRef],
        { cwd },
      );
      results.push({ taskId, path: wtPath, branch: branchName, status: "created" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ taskId, path: wtPath, status: "failed", error: message });
    }
  }

  return results;
}

/**
 * Remove prepared worktrees for a feature.
 *
 * @param {string} cwd
 * @param {{ featureId: string, taskIds?: string[], force?: boolean }} options
 * @returns {Promise<Array<{ path: string, status: string, error?: string }>>}
 */
export async function cleanupWorkspaces(cwd, { featureId, taskIds, force = false }) {
  if (!(await isGitRepository(cwd))) {
    throw new Error("workspace-cleanup requires a git repository");
  }

  const targets = taskIds?.length
    ? taskIds.map((taskId) => workspacePath(cwd, featureId, taskId))
    : await listWorkspacePaths(cwd, featureId);

  /** @type {Array<{ path: string, status: string, error?: string }>} */
  const results = [];

  for (const wtPath of targets) {
    try {
      await fs.access(wtPath);
    } catch {
      results.push({ path: wtPath, status: "missing" });
      continue;
    }

    const args = ["worktree", "remove", wtPath];
    if (force) {
      args.push("--force");
    }

    try {
      await execFileAsync("git", args, { cwd });
      results.push({ path: wtPath, status: "removed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ path: wtPath, status: "failed", error: message });
    }
  }

  return results;
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @returns {Promise<Array<{ taskId: string, path: string }>>}
 */
export async function listWorkspaces(cwd, featureId) {
  const paths = await listWorkspacePaths(cwd, featureId);
  return paths.map((wtPath) => ({
    taskId: path.basename(wtPath),
    path: wtPath,
  }));
}

/**
 * @param {Awaited<ReturnType<typeof listWorkspaces>>} workspaces
 * @param {{ json?: boolean, featureId?: string }} [options]
 */
export function formatWorkspaceList(workspaces, options = {}) {
  if (options.json) {
    return JSON.stringify({ feature: options.featureId, workspaces }, null, 2);
  }

  const lines = ["Workspace list:"];
  if (!workspaces.length) {
    lines.push("  (none)");
  } else {
    for (const item of workspaces) {
      lines.push(`  ${item.taskId}: ${item.path}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {ReturnType<typeof prepareWorkspaces> extends Promise<infer T> ? T : never} results
 * @param {{ json?: boolean }} [options]
 */
export function formatWorkspaceResults(results, options = {}) {
  if (options.json) {
    return JSON.stringify({ workspaces: results }, null, 2);
  }

  const lines = ["Workspace isolation results:"];
  for (const item of results) {
    const branch = item.branch ? ` (${item.branch})` : "";
    const error = item.error ? ` — ${item.error}` : "";
    lines.push(`  ${item.taskId ?? path.basename(item.path)}: ${item.status}${branch}${error}`);
  }
  return `${lines.join("\n")}\n`;
}
