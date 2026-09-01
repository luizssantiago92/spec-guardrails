import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildFeatureOverview,
  featureOverview,
  formatFeatureOverview,
} from "../lib/feature-overview.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("feature-overview", () => {
  it("builds traceability rows from spec, tasks, and validation", async () => {
    const cwd = await createTempDir("feature-overview-");
    const feature = "001-auth";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n- Feature: ${feature}\n- Phase: Verify\n- Branch: feat/${feature}\n`,
    );
    await fs.writeFile(
      path.join(featureDir, "spec.md"),
      `# Auth login\n\n### REQ-001\nUsers SHALL sign in with email.\n`,
    );
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      `# Tasks\n\n## T1: login route\n\n- Requirement: REQ-001\n- Files: src/auth.ts\n- [x] complete\n`,
    );
    await fs.writeFile(
      path.join(featureDir, "validation.md"),
      "# Validation\n\n| REQ-001 | tests/auth.test.ts:12 |\n",
    );

    const overview = await buildFeatureOverview(feature, { cwd });
    assert.equal(overview.goal, "Auth login");
    assert.equal(overview.traceability.length, 1);
    assert.equal(overview.traceability[0].reqId, "REQ-001");
    assert.deepEqual(overview.traceability[0].tasks, ["T1"]);
    assert.equal(
      overview.traceability[0].evidence,
      "tests/auth.test.ts:12",
    );
    assert.match(formatFeatureOverview(overview), /REQ-001/);
  });

  it("writes overview.md when --write is used", async () => {
    const cwd = await createTempDir("feature-overview-write-");
    const feature = "002-ui";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n- Feature: ${feature}\n- Phase: Specify\n`,
    );
    await fs.writeFile(path.join(featureDir, "spec.md"), "# Theme toggle\n");

    const result = await featureOverview(feature, { cwd, write: true });
    const outPath = path.join(featureDir, "overview.md");
    assert.equal(result.writtenTo, outPath);
    const text = await fs.readFile(outPath, "utf8");
    assert.match(text, /Feature overview: 002-ui/);
    assert.match(text, /Theme toggle/);
  });
});
