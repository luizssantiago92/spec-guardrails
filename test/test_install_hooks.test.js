import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";

import { installHooks } from "../lib/install-hooks.js";

const execFileAsync = promisify(execFile);

async function git(cwd, args) {
  return execFileAsync("git", args, { cwd, encoding: "utf8" });
}

async function pathExists(target) {
  return fs.access(target).then(
    () => true,
    () => false,
  );
}

async function initRepo(prefix) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await git(cwd, ["init"]);
  await git(cwd, ["config", "user.email", "hooks-test@example.com"]);
  await git(cwd, ["config", "user.name", "Hooks Test"]);
  return cwd;
}

async function commitFile(cwd, name, contents, message) {
  await fs.writeFile(path.join(cwd, name), contents);
  await git(cwd, ["add", name]);
  await git(cwd, ["commit", "-m", message]);
}

describe("install-hooks", () => {
  it("rejects a directory that is not a git repository", async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hooks-nogit-"));
    try {
      await assert.rejects(() => installHooks(cwd), /Not a git repository/);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("installs pre-commit and commit-msg under git rev-parse --git-path hooks", async () => {
    const cwd = await initRepo("hooks-install-");
    try {
      const { stdout } = await git(cwd, ["rev-parse", "--git-path", "hooks"]);
      const hooksDir = path.resolve(cwd, stdout.trim());
      const result = await installHooks(cwd);

      assert.equal(result.action, "installed");
      assert.equal(result.path, path.join(hooksDir, "pre-commit"));
      assert.deepEqual(
        result.hooks.map((hook) => hook.name),
        ["pre-commit", "commit-msg"],
      );

      const preCommit = await fs.readFile(path.join(hooksDir, "pre-commit"), "utf8");
      const commitMsg = await fs.readFile(path.join(hooksDir, "commit-msg"), "utf8");
      assert.doesNotMatch(preCommit, /git-path COMMIT_EDITMSG/);
      assert.doesNotMatch(preCommit, /--message/);
      assert.match(preCommit, /check_commit\.py --staged/);
      assert.match(commitMsg, /check_commit\.py --file "\$1"/);
      assert.doesNotMatch(commitMsg, /git-path COMMIT_EDITMSG/);

      const preStat = await fs.stat(path.join(hooksDir, "pre-commit"));
      assert.ok(preStat.mode & 0o111, "pre-commit should be executable");
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("does not overwrite a hook it does not manage", async () => {
    const cwd = await initRepo("hooks-foreign-");
    try {
      const { stdout } = await git(cwd, ["rev-parse", "--git-path", "hooks"]);
      const hooksDir = path.resolve(cwd, stdout.trim());
      await fs.mkdir(hooksDir, { recursive: true });
      const foreign = "#!/bin/sh\necho user-hook\n";
      await fs.writeFile(path.join(hooksDir, "pre-commit"), foreign, "utf8");

      await assert.rejects(() => installHooks(cwd), /not managed by Spec Guardrails/);
      assert.equal(await fs.readFile(path.join(hooksDir, "pre-commit"), "utf8"), foreign);
      assert.equal(await pathExists(path.join(hooksDir, "commit-msg")), false);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("removes only Spec Guardrails hooks", async () => {
    const cwd = await initRepo("hooks-remove-");
    try {
      const installed = await installHooks(cwd);
      const removed = await installHooks(cwd, { remove: true });
      assert.equal(removed.action, "removed");
      for (const hook of installed.hooks) {
        assert.equal(await pathExists(hook.path), false);
      }

      const again = await installHooks(cwd, { remove: true });
      assert.equal(again.action, "skipped");

      await installHooks(cwd);
      const { stdout } = await git(cwd, ["rev-parse", "--git-path", "hooks"]);
      const hooksDir = path.resolve(cwd, stdout.trim());
      const foreign = "#!/bin/sh\necho keep-me\n";
      await fs.writeFile(path.join(hooksDir, "commit-msg"), foreign, "utf8");
      const partial = await installHooks(cwd, { remove: true });
      assert.equal(partial.action, "removed");
      assert.equal(
        partial.hooks.find((hook) => hook.name === "commit-msg").action,
        "skipped",
      );
      assert.equal(await fs.readFile(path.join(hooksDir, "commit-msg"), "utf8"), foreign);
      assert.equal(await pathExists(path.join(hooksDir, "pre-commit")), false);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("installs into a linked worktree where .git is a file", async () => {
    const repo = await initRepo("hooks-wt-main-");
    const worktree = path.join(os.tmpdir(), `hooks-wt-${process.pid}-${Date.now()}`);
    try {
      await commitFile(repo, "README.md", "hi\n", "chore: init");
      await git(repo, ["worktree", "add", worktree, "HEAD"]);

      const gitFile = await fs.lstat(path.join(worktree, ".git"));
      assert.equal(gitFile.isFile(), true);

      const result = await installHooks(worktree);
      const { stdout } = await git(worktree, ["rev-parse", "--git-path", "hooks"]);
      const hooksDir = path.resolve(worktree, stdout.trim());

      const bogusDir = path.join(worktree, ".git", "hooks");
      assert.equal(result.path, path.join(hooksDir, "pre-commit"));
      assert.notEqual(hooksDir, bogusDir);
      assert.equal(await pathExists(path.join(hooksDir, "pre-commit")), true);
      assert.equal(await pathExists(path.join(hooksDir, "commit-msg")), true);
      assert.equal(await pathExists(path.join(bogusDir, "pre-commit")), false);
    } finally {
      await fs.rm(worktree, { recursive: true, force: true });
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  it("honors core.hooksPath instead of .git/hooks", async () => {
    const cwd = await initRepo("hooks-path-");
    try {
      await git(cwd, ["config", "core.hooksPath", ".githooks"]);
      const result = await installHooks(cwd);
      const customDir = path.join(cwd, ".githooks");

      assert.equal(path.dirname(result.path), customDir);
      assert.equal(await pathExists(path.join(customDir, "pre-commit")), true);
      assert.equal(await pathExists(path.join(customDir, "commit-msg")), true);
      assert.equal(await pathExists(path.join(cwd, ".git", "hooks", "pre-commit")), false);
      assert.equal(await pathExists(path.join(cwd, ".git", "hooks", "commit-msg")), false);

      const removed = await installHooks(cwd, { remove: true });
      assert.equal(removed.action, "removed");
      assert.equal(await pathExists(path.join(customDir, "pre-commit")), false);
      assert.equal(await pathExists(path.join(customDir, "commit-msg")), false);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });
});
