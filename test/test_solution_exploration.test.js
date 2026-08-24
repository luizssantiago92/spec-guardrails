import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildExplorationMarkdown,
  candidateWorkspaceId,
  initExploration,
  parseExplorationMarkdown,
  recordExplorationDecision,
  validateExploration,
} from "../lib/solution-exploration.js";

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

async function scaffoldFeature(cwd, featureId) {
  const featurePath = path.join(cwd, ".specs/features", featureId);
  await fs.mkdir(featurePath, { recursive: true });
  await fs.writeFile(
    path.join(featurePath, "spec.md"),
    "# Spec\n\n## Assumptions\n- test\n\n## Requirements\n\n### REQ-001\nUser SHALL login.\n",
    "utf8",
  );
}

describe("solution exploration", () => {
  it("builds and parses exploration markdown with comparison matrix", () => {
    const markdown = buildExplorationMarkdown("001-auth", [
      { id: "A", label: "JWT" },
      { id: "B", label: "Session" },
    ], process.cwd());

    assert.match(markdown, /Candidate A|JWT/);
    assert.match(markdown, /Spec compliance/);

    const parsed = parseExplorationMarkdown(markdown);
    assert.equal(parsed.status, "exploring");
    assert.equal(parsed.candidates.length, 2);
    assert.equal(parsed.candidates[0].id, "A");
    assert.ok(parsed.comparison["Spec compliance"]);
  });

  it("validates missing comparison cells", () => {
    const parsed = parseExplorationMarkdown(
      buildExplorationMarkdown("001-auth", [
        { id: "A", label: "One" },
        { id: "B", label: "Two" },
      ], process.cwd()),
    );

    const result = validateExploration(parsed);
    assert.equal(result.ok, false);
    assert.ok(result.messages.some((message) => message.includes("Spec compliance")));
  });

  it("initializes exploration artifact and candidate worktrees", async () => {
    const cwd = await createTempDir("sol-exp-init-");
    await initGitRepo(cwd);
    const featureId = "001-auth";
    await scaffoldFeature(cwd, featureId);

    const result = await initExploration(cwd, featureId, [
      { id: "A", label: "Redis" },
      { id: "B", label: "Memory" },
    ]);

    assert.equal(result.featureId, featureId);
    assert.equal(result.workspaces.length, 2);
    assert.ok(result.workspaces.every((item) => item.status === "created"));

    const explorationPath = path.join(cwd, ".specs/features", featureId, "exploration.md");
    const content = await fs.readFile(explorationPath, "utf8");
    assert.match(content, /exploring/);

    for (const id of ["A", "B"]) {
      const wt = path.join(cwd, ".specs/workspaces", featureId, candidateWorkspaceId(id));
      const stat = await fs.stat(wt);
      assert.ok(stat.isDirectory());
    }
  });

  it("records decision after comparison matrix is filled", async () => {
    const cwd = await createTempDir("sol-exp-select-");
    await initGitRepo(cwd);
    const featureId = "002-cache";
    await scaffoldFeature(cwd, featureId);

    await initExploration(cwd, featureId, [
      { id: "A", label: "Redis" },
      { id: "B", label: "Memory" },
    ]);

    const explorationPath = path.join(cwd, ".specs/features", featureId, "exploration.md");
    let content = await fs.readFile(explorationPath, "utf8");

    for (const criterion of [
      "Spec compliance",
      "Test results",
      "Complexity",
      "Maintainability",
      "Performance",
      "Risk",
    ]) {
      content = content.replace(
        `| ${criterion} |  |  |`,
        `| ${criterion} | pass | fail |`,
      );
    }
    await fs.writeFile(explorationPath, content, "utf8");

    const decision = await recordExplorationDecision(cwd, featureId, {
      selected: "A",
      rationale: "Lower operational risk and better spec fit",
    });

    assert.equal(decision.selected, "A");
    const updated = await fs.readFile(explorationPath, "utf8");
    assert.match(updated, /decided/);
    assert.match(updated, /\*\*Selected\*\*: A/);
  });
});
