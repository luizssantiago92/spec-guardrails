import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  briefPathForScope,
  discoverKickoffSources,
  formatPromoteMessage,
  normalizeScope,
  reqAnalysisInit,
} from "../lib/req-analysis.js";

describe("req-analysis", () => {
  /** @type {string | undefined} */
  let tempDir;

  after(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("normalizes scope", () => {
    assert.equal(normalizeScope("project"), "project");
    assert.equal(normalizeScope("feature"), "feature");
    assert.throws(() => normalizeScope("invalid"), /Scope must be/);
  });

  it("resolves brief paths by scope", () => {
    assert.equal(
      briefPathForScope("project", ""),
      ".specs/project/requirements-brief.md",
    );
    assert.equal(
      briefPathForScope("feature", "settings-page"),
      ".specs/project/feature-briefs/settings-page/requirements-brief.md",
    );
  });

  it("scaffolds project brief and kickoff", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "req-analysis-"));
    const result = await reqAnalysisInit("My product vision", {
      scope: "project",
      cwd: tempDir,
    });

    assert.equal(result.scope, "project");
    assert.ok(result.paths.includes(".specs/project/requirements-brief.md"));
    assert.ok(result.paths.includes(".specs/project/kickoff.md"));

    const brief = await fs.readFile(
      path.join(tempDir, ".specs/project/requirements-brief.md"),
      "utf8",
    );
    assert.match(brief, /## Goal/);
    assert.match(brief, /My product vision/);
    assert.match(brief, /Feature candidates/);
  });

  it("scaffolds feature brief without kickoff stub", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "req-analysis-f-"));
    const result = await reqAnalysisInit("Settings page", {
      scope: "feature",
      cwd: tempDir,
    });

    assert.equal(result.scope, "feature");
    assert.equal(result.paths.length, 1);
    assert.match(
      result.paths[0],
      /\.specs\/project\/feature-briefs\/settings-page\/requirements-brief\.md$/,
    );

    const brief = await fs.readFile(path.join(tempDir, result.paths[0]), "utf8");
    assert.match(brief, /Settings page/);
    assert.doesNotMatch(brief, /Feature candidates/);
  });

  it("discovers kickoff sources", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "req-analysis-d-"));
    await fs.mkdir(path.join(tempDir, "docs"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "prd.md"), "# PRD\n", "utf8");

    const discovered = await discoverKickoffSources(tempDir);
    const prd = discovered.find((entry) => entry.path === "prd.md");
    assert.ok(prd);
    assert.equal(prd.exists, true);
  });

  it("promote messages mention specify and memory-index", () => {
    const project = formatPromoteMessage({ scope: "project" });
    assert.match(project, /ROADMAP/);
    assert.match(project, /memory-index rebuild/);

    const feature = formatPromoteMessage({
      scope: "feature",
      description: "auth flow",
    });
    assert.match(feature, /feature-init/);
    assert.match(feature, /\/specify/);
  });
});

describe("req-analysis CLI", () => {
  it("lists req-analysis in help", async () => {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(process.execPath, ["index.js", "--help"], {
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout + result.stderr, /req-analysis init/);
    assert.match(result.stdout + result.stderr, /req-analysis discover/);
  });
});
