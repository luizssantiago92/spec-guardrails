import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  cleanupLegacyCursorHooks,
  CURSOR_HOOK_EDIT,
  CURSOR_HOOKS_JSON,
  CURSOR_HOOK_SANDBOX,
} from "../lib/cursor-hooks-cleanup.js";
import { install } from "../lib/install.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function pathExists(target) {
  return fs.access(target).then(
    () => true,
    () => false,
  );
}

describe("cursor hooks legacy cleanup", () => {
  it("removes shipped scripts, empty hooks.json, and cursor block from config", async () => {
    const cwd = await createTempDir("hook-cleanup-full-");
    await fs.mkdir(path.join(cwd, ".cursor/hooks"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, CURSOR_HOOKS_JSON),
      `${JSON.stringify({ version: 1, hooks: {} }, null, 2)}\n`,
      "utf8",
    );
    await fs.writeFile(path.join(cwd, CURSOR_HOOK_EDIT), "// legacy\n", "utf8");
    await fs.writeFile(path.join(cwd, CURSOR_HOOK_SANDBOX), "// legacy\n", "utf8");
    await fs.writeFile(
      path.join(cwd, ".specs/config.yaml"),
      "cursor:\n  hooks: false\n\nsandbox:\n  mode: warn\n",
      "utf8",
    );

    const messages = [];
    const result = await cleanupLegacyCursorHooks(cwd, {
      log: (message) => messages.push(message),
    });

    assert.equal(result.changed, true);
    assert.equal(await pathExists(path.join(cwd, CURSOR_HOOK_EDIT)), false);
    assert.equal(await pathExists(path.join(cwd, CURSOR_HOOKS_JSON)), false);
    const config = await fs.readFile(path.join(cwd, ".specs/config.yaml"), "utf8");
    assert.equal(/^cursor:/m.test(config), false);
    assert.ok(messages.some((message) => message.includes("deprecated in 4.3.0")));
  });

  it("preserves user hooks in hooks.json while removing shipped entries", async () => {
    const cwd = await createTempDir("hook-cleanup-user-");
    await fs.mkdir(path.join(cwd, ".cursor/hooks"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, CURSOR_HOOKS_JSON),
      `${JSON.stringify(
        {
          version: 1,
          hooks: {
            preToolUse: [
              { command: ".cursor/hooks/custom.mjs" },
              { command: ".cursor/hooks/context-guard-edit.mjs" },
            ],
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await fs.writeFile(path.join(cwd, CURSOR_HOOK_EDIT), "// legacy\n", "utf8");

    const result = await cleanupLegacyCursorHooks(cwd, { log: () => {} });

    assert.equal(result.changed, true);
    const hooksJson = JSON.parse(await fs.readFile(path.join(cwd, CURSOR_HOOKS_JSON), "utf8"));
    assert.deepEqual(hooksJson.hooks.preToolUse, [{ command: ".cursor/hooks/custom.mjs" }]);
  });

  it("is silent when no legacy artifacts remain", async () => {
    const cwd = await createTempDir("hook-cleanup-clean-");
    const messages = [];
    const result = await cleanupLegacyCursorHooks(cwd, {
      log: (message) => messages.push(message),
    });

    assert.equal(result.changed, false);
    assert.equal(messages.length, 0);
  });

  it("install runs cleanup and accepts deprecated hook flags as no-op", async () => {
    const cwd = await createTempDir("hook-install-deprecated-");
    await fs.mkdir(path.join(cwd, ".cursor/hooks"), { recursive: true });
    await fs.writeFile(path.join(cwd, CURSOR_HOOK_EDIT), "// legacy\n", "utf8");

    await install({ cwd, silent: true, preset: "default" });

    assert.equal(await pathExists(path.join(cwd, CURSOR_HOOK_EDIT)), false);
  });
});
