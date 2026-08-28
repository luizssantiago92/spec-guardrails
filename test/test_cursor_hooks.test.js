import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CURSOR_HOOK_EDIT,
  CURSOR_HOOKS_JSON,
  CURSOR_HOOK_SANDBOX,
  mergeCursorHooksConfig,
  parseCursorHooksFromConfigText,
} from "../lib/cursor-hooks.js";
import {
  evaluateHookInput,
  extractEditPath,
  shouldSkipPath,
} from "../templates/cursor/hooks/context-guard-edit.mjs";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("cursor hooks config merge", () => {
  it("reads cursor.hooks from config yaml", () => {
    assert.equal(
      parseCursorHooksFromConfigText("cursor:\n  hooks: true\n"),
      true,
    );
    assert.equal(
      parseCursorHooksFromConfigText("cursor:\n  hooks: false\n"),
      false,
    );
    assert.equal(parseCursorHooksFromConfigText("sandbox:\n  mode: off\n"), false);
  });

  it("adds shipped hook entries without removing user hooks", () => {
    const merged = mergeCursorHooksConfig(
      {
        version: 1,
        hooks: {
          preToolUse: [{ command: ".cursor/hooks/custom.mjs" }],
        },
      },
      {
        version: 1,
        hooks: {
          preToolUse: [{ command: ".cursor/hooks/context-guard-edit.mjs", matcher: "Write" }],
        },
      },
    );

    assert.equal(merged.hooks.preToolUse.length, 2);
    assert.equal(
      merged.hooks.preToolUse.some((entry) => entry.command === ".cursor/hooks/custom.mjs"),
      true,
    );
  });

  it("does not duplicate the same command on reinstall", () => {
    const template = {
      version: 1,
      hooks: {
        preToolUse: [{ command: ".cursor/hooks/context-guard-edit.mjs" }],
      },
    };

    const once = mergeCursorHooksConfig(null, template);
    const twice = mergeCursorHooksConfig(once, template);
    assert.equal(twice.hooks.preToolUse.length, 1);
  });
});

describe("context-guard edit hook", () => {
  it("extracts path from Write tool input", () => {
    const editPath = extractEditPath({
      tool_name: "Write",
      tool_input: { path: "src/auth.ts" },
    });
    assert.equal(editPath, "src/auth.ts");
  });

  it("skips .specs/ and .cursor/ paths", () => {
    assert.equal(shouldSkipPath(".specs/STATE.md"), true);
    assert.equal(shouldSkipPath(".cursor/rules/foo.mdc"), true);
    assert.equal(shouldSkipPath("src/auth.ts"), false);
  });

  it("allows edits when guardrails is not installed", async () => {
    const cwd = await createTempDir("hook-no-guardrails-");
    const previous = process.cwd();
    process.chdir(cwd);
    try {
      const decision = evaluateHookInput({
        tool_name: "Write",
        tool_input: { path: "src/auth.ts" },
      });
      assert.equal(decision.allowed, true);
    } finally {
      process.chdir(previous);
    }
  });

  it("install copies hook script and merges hooks.json when --with-cursor-hooks", async () => {
    const { install } = await import("../lib/install.js");
    const cwd = await createTempDir("hook-install-");
    await install({ cwd, silent: true, withCursorHooks: true });

    assert.equal(await fs.access(path.join(cwd, CURSOR_HOOK_EDIT)).then(() => true, () => false), true);
    assert.equal(await fs.access(path.join(cwd, CURSOR_HOOK_SANDBOX)).then(() => true, () => false), true);
    const hooksJson = JSON.parse(await fs.readFile(path.join(cwd, CURSOR_HOOKS_JSON), "utf8"));
    assert.ok(Array.isArray(hooksJson.hooks.preToolUse));
    assert.ok(Array.isArray(hooksJson.hooks.beforeShellExecution));
    assert.ok(
      hooksJson.hooks.preToolUse.some(
        (entry) => entry.command === ".cursor/hooks/context-guard-edit.mjs",
      ),
    );
  });

  it("install does not register hooks by default", async () => {
    const { install } = await import("../lib/install.js");
    const cwd = await createTempDir("hook-install-default-");
    await install({ cwd, silent: true });

    assert.equal(await fs.access(path.join(cwd, CURSOR_HOOKS_JSON)).then(() => true, () => false), false);
    assert.equal(await fs.access(path.join(cwd, CURSOR_HOOK_EDIT)).then(() => true, () => false), false);
  });

  it("install --without-cursor-hooks removes shipped hook entries", async () => {
    const { install } = await import("../lib/install.js");
    const cwd = await createTempDir("hook-install-remove-");
    await install({ cwd, silent: true, withCursorHooks: true });
    await install({ cwd, silent: true, withoutCursorHooks: true });

    assert.equal(await fs.access(path.join(cwd, CURSOR_HOOK_EDIT)).then(() => true, () => false), false);
    const hooksJson = JSON.parse(await fs.readFile(path.join(cwd, CURSOR_HOOKS_JSON), "utf8"));
    assert.equal(
      hooksJson.hooks.preToolUse.some(
        (entry) => entry.command === ".cursor/hooks/context-guard-edit.mjs",
      ),
      false,
    );
  });
});
