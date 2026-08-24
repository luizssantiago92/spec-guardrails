import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { featureStatus, formatFeatureStatus } from "../lib/feature-status.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("feature-status", () => {
  it("reports artifacts and next step for a mid-Execute feature", async () => {
    const cwd = await createTempDir("feature-status-");
    const feature = "001-auth";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n- Feature: ${feature}\n- Phase: Execute\n- Branch: feat/${feature}\n`,
    );
    await fs.writeFile(path.join(featureDir, "spec.md"), "# Spec\n");
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: login\n\n## T2: session\n\n- [x] complete\n",
    );

    const status = await featureStatus(feature, { cwd });
    assert.equal(status.featureId, feature);
    assert.equal(status.artifacts.spec, true);
    assert.equal(status.artifacts.tasks, true);
    assert.equal(status.tasks?.total, 2);
    assert.match(status.next, /loop-plan|validate/);
    assert.match(formatFeatureStatus(status), /Feature: 001-auth/);
  });

  it("suggests archive when validation passed", async () => {
    const cwd = await createTempDir("feature-status-done-");
    const feature = "002-done";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(path.join(featureDir, "spec.md"), "# Spec\n");
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: only\n\n- [x] complete\n",
    );
    await fs.writeFile(
      path.join(featureDir, "validation.md"),
      "# Validation\n\n- Verdict: PASS\n",
    );

    const status = await featureStatus(feature, { cwd });
    assert.equal(status.verdict, "PASS");
    assert.match(status.next, /archive-feature/);
  });

  it("reads PASS from a ## Verdict heading", async () => {
    const cwd = await createTempDir("feature-status-heading-");
    const feature = "003-heading";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(path.join(featureDir, "spec.md"), "# Spec\n");
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: only\n\n- [x] complete\n",
    );
    await fs.writeFile(
      path.join(featureDir, "validation.md"),
      "# Validation\n\n## Verdict\n\nPASS\n",
    );

    const status = await featureStatus(feature, { cwd });
    assert.equal(status.verdict, "PASS");
    assert.match(status.next, /archive-feature/);
  });
});
