import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  runCompanionDoctorChecks,
  summarizeCompanionChecks,
} from "../lib/companion-doctor.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("companion doctor probes", () => {
  it("reports detailed checks when INDEX lists tech-atlas", async () => {
    const cwd = await createTempDir("companion-doc-");
    const companionDir = path.join(cwd, ".specs/companions");
    await fs.mkdir(companionDir, { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/tech-atlas/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/tech-atlas/scripts/validate_layer_routing.py"),
      "# gate\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(cwd, ".cursor/rules/tech-atlas.mdc"),
      "---\n",
      "utf8",
    );
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/project/PROJECT.md"),
      "## Tech Atlas — Path Domain registry\n\n| web | `web-engineering.md` | `apps/web/**` |\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(companionDir, "INDEX.json"),
      JSON.stringify(
        {
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
              gates: [
                "validate_layer_routing.py",
                "validate_tech_atlas_routing.py",
              ],
              projectSection: "## Tech Atlas — Path Domain registry",
              ruleFile: ".cursor/rules/tech-atlas.mdc",
              preservePaths: [".specs/tech-atlas/scripts"],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/guardrails/scripts/validate_tech_atlas_routing.py"),
      "# mirror\n",
      "utf8",
    );

    const report = await runCompanionDoctorChecks(cwd);
    assert.equal(report.companions.length, 1);
    assert.ok(report.checks.some((c) => c.id === "atlas-tech-atlas-gate" && c.pass));
    assert.ok(report.checks.some((c) => c.id === "atlas-tech-atlas-mirror" && c.pass));
    const summary = summarizeCompanionChecks(report.checks);
    assert.equal(summary.ready, true);
  });
});
