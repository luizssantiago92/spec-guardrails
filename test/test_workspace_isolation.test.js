import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  cleanupWorkspaces,
  listWorkspacePaths,
  prepareWorkspaces,
  workspacePath,
} from "../lib/workspace-isolation.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initGitRepo(cwd) {
  execFileSync("git", ["init"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd, stdio: "ignore" });
  await fs.writeFile(path.join(cwd, "README.md"), "# test\n");
  execFileSync("git", ["add", "README.md"], { cwd, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "chore: init"], { cwd, stdio: "ignore" });
}

describe("workspace isolation", () => {
  it("creates and cleans up git worktrees for parallel tasks", async () => {
    const cwd = await createTempDir("ws-iso-");
    await initGitRepo(cwd);

    const featureId = "001-auth";
    const prepared = await prepareWorkspaces(cwd, {
      featureId,
      taskIds: ["T1", "T2"],
    });

    assert.equal(prepared.length, 2);
    assert.ok(prepared.every((item) => item.status === "created"));
    assert.equal(await listWorkspacePaths(cwd, featureId).then((items) => items.length), 2);

    for (const taskId of ["T1", "T2"]) {
      const wt = workspacePath(cwd, featureId, taskId);
      const stat = await fs.stat(wt);
      assert.ok(stat.isDirectory());
    }

    const cleaned = await cleanupWorkspaces(cwd, { featureId, force: true });
    assert.equal(cleaned.length, 2);
    assert.ok(cleaned.every((item) => item.status === "removed"));
  });
});
