import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  collectCompanionPreservePaths,
  readCompanionsIndex,
} from "../lib/companions.js";

/** @param {string} prefix */
async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("companions index", () => {
  it("returns fallback preserve paths when INDEX is missing", async () => {
    const cwd = await createTempDir("companions-fallback-");
    const paths = await collectCompanionPreservePaths(cwd);
    assert.ok(paths.includes(".specs/tech-atlas"));
    assert.ok(paths.includes(".specs/atlas"));
    assert.ok(paths.includes(".specs/companions"));
  });

  it("reads INDEX.json when present", async () => {
    const cwd = await createTempDir("companions-index-");
    const dir = path.join(cwd, ".specs/companions");
    await fs.mkdir(dir, { recursive: true });
    const index = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      paired: true,
      companions: [
        {
          id: "tech-atlas",
          npm: "@luizsantiago/tech-atlas",
          version: "0.6.0",
          displayName: "Tech Atlas",
          scriptsDir: ".specs/tech-atlas/scripts",
          gates: ["validate_layer_routing.py"],
          projectSection: "## Tech Atlas — Path Domain registry",
          ruleFile: ".cursor/rules/tech-atlas.mdc",
          preservePaths: [".specs/tech-atlas/scripts"],
        },
      ],
    };
    await fs.writeFile(
      path.join(dir, "INDEX.json"),
      JSON.stringify(index, null, 2),
      "utf8",
    );

    const read = await readCompanionsIndex(cwd);
    assert.equal(read?.companions.length, 1);
    const paths = await collectCompanionPreservePaths(cwd);
    assert.ok(paths.includes(".specs/tech-atlas/scripts"));
    assert.ok(paths.includes(".cursor/rules"));
  });
});
