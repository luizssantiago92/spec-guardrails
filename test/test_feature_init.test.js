import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  allocateFeatureWorkspace,
  featureInit,
  formatFeatureId,
  nextFeatureNumber,
  slugifyDescription,
} from "../lib/feature.js";
import { initGuardrailsMemory } from "../lib/memory.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initGitRepo(cwd) {
  const run = (args) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
  };

  run(["init"]);
  run(["config", "user.email", "test@example.com"]);
  run(["config", "user.name", "Test"]);
  await fs.writeFile(path.join(cwd, "README.md"), "# test\n");
  run(["add", "README.md"]);
  run(["commit", "-m", "chore: init"]);
}

describe("feature init", () => {
  it("slugifyDescription normalizes text", () => {
    assert.equal(slugifyDescription("Chat with Presence!!!"), "chat-with-presence");
  });

  it("allocates sequential feature IDs", async () => {
    const cwd = await createTempDir("feature-num-");
    await fs.mkdir(path.join(cwd, ".specs/features/001-alpha"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/features/002-beta"), { recursive: true });

    assert.equal(await nextFeatureNumber(cwd), 3);
    assert.equal(formatFeatureId(3, "gamma"), "003-gamma");
  });

  it("creates feature folder, spec stub, and STATE", async () => {
    const cwd = await createTempDir("feature-init-");
    await initGuardrailsMemory(cwd);

    const result = await featureInit("chat with presence", {
      cwd,
      skipBranch: true,
    });

    assert.equal(result.featureId, "001-chat-with-presence");
    const spec = await fs.readFile(
      path.join(cwd, ".specs/features/001-chat-with-presence/spec.md"),
      "utf8",
    );
    assert.match(spec, /chat with presence/);

    const state = await fs.readFile(path.join(cwd, ".specs/STATE.md"), "utf8");
    assert.match(state, /Feature: 001-chat-with-presence/);
    assert.match(state, /Branch: feat\/001-chat-with-presence/);
  });

  it("creates and checks out a feature branch (Tier 0)", async () => {
    const cwd = await createTempDir("feature-branch-");
    await initGitRepo(cwd);
    await initGuardrailsMemory(cwd);

    const result = await featureInit("dark mode toggle", { cwd });
    assert.equal(result.branchCreated, true);

    const branch = spawnSync("git", ["branch", "--show-current"], {
      cwd,
      encoding: "utf8",
    });
    assert.equal(branch.stdout.trim(), "feat/001-dark-mode-toggle");
  });

  it("retries allocation when the feature directory already exists", async () => {
    const cwd = await createTempDir("feature-race-");
    await fs.mkdir(path.join(cwd, ".specs/features/001-chat"), { recursive: true });

    const first = await allocateFeatureWorkspace(cwd, "chat");
    assert.equal(first.featureId, "002-chat");

    const second = await allocateFeatureWorkspace(cwd, "chat");
    assert.equal(second.featureId, "003-chat");
  });
});
