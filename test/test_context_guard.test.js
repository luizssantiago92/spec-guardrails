import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  checkBeforeEdit,
  collectTaskFilePaths,
  countOpenTasks,
  evaluateExecuteContext,
  pathInApprovedTaskFiles,
} from "../lib/context-guard.js";
import { mergeExecutionPolicy, DEFAULT_POLICY } from "../lib/execution-policy.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("context guard", () => {
  it("counts open tasks and collects file paths", () => {
    const tasks = [
      "### T1: Auth route",
      "- Files: src/auth.ts, tests/auth.test.ts",
      "- [ ] implement route",
      "### T2: Docs",
      "- Files: docs/auth.md",
      "- [x] update docs",
    ].join("\n");

    assert.equal(countOpenTasks(tasks), 1);
    const files = collectTaskFilePaths(tasks);
    assert.ok(pathInApprovedTaskFiles("src/auth.ts", files));
    assert.equal(pathInApprovedTaskFiles("src/other.ts", files), false);
  });

  it("blocks edit when no active feature is configured", async () => {
    const cwd = await createTempDir("ctx-guard-");
    await fs.mkdir(path.join(cwd, ".specs"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      "# State\n\n## Active Feature\n- Feature: —\n",
      "utf8",
    );

    const result = await checkBeforeEdit(cwd, "src/auth.ts");
    assert.equal(result.allowed, false);
    assert.equal(result.exitCode, 1);
  });

  it("allows edit for paths listed in task Files and blocks unknown paths", async () => {
    const cwd = await createTempDir("ctx-guard-ok-");
    const featureId = "001-auth";
    const featurePath = path.join(cwd, ".specs/features", featureId);
    await fs.mkdir(featurePath, { recursive: true });

    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n## Active Feature\n- Feature: ${featureId}\n- Phase: Execute\n`,
      "utf8",
    );

    await fs.writeFile(
      path.join(featurePath, "tasks.md"),
      [
        "### T1: Route",
        "- Files: src/auth.ts",
        "- [ ] implement",
      ].join("\n"),
      "utf8",
    );

    const allowed = await checkBeforeEdit(cwd, "src/auth.ts", { operation: "write" });
    assert.equal(allowed.allowed, true);

    const blocked = await checkBeforeEdit(cwd, "src/other.ts", { operation: "write" });
    assert.equal(blocked.allowed, false);
  });

  it("reports execute readiness from STATE and tasks", async () => {
    const cwd = await createTempDir("ctx-guard-status-");
    const featureId = "002-chat";
    const featurePath = path.join(cwd, ".specs/features", featureId);
    await fs.mkdir(featurePath, { recursive: true });

    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n## Active Feature\n- Feature: ${featureId}\n- Phase: Execute\n`,
      "utf8",
    );

    await fs.writeFile(
      path.join(featurePath, "tasks.md"),
      "### T1: Work\n- Files: src/chat.ts\n- [ ] do work\n",
      "utf8",
    );

    const context = await evaluateExecuteContext(cwd);
    assert.equal(context.ok, true);
    assert.equal(context.featureId, featureId);
    assert.equal(context.openTasks, 1);
  });
});
