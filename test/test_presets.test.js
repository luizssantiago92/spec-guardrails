import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { mergeGuardrailsConfigs, resolveGuardrailsConfig } from "../lib/config.js";
import { featureInit } from "../lib/feature.js";
import { initGuardrailsMemory } from "../lib/memory.js";
import {
  initProjectConfig,
  listPresets,
  loadPreset,
  loadResolvedConfig,
  readBranchPrefix,
} from "../lib/presets.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("presets", () => {
  it("lists built-in presets", async () => {
    const presets = await listPresets();
    assert.ok(presets.includes("default"));
    assert.ok(presets.includes("node-ts"));
    assert.ok(presets.includes("python"));
    assert.ok(presets.includes("python-platform"));
  });

  it("loads python-platform preset with ship_surface globs", async () => {
    const preset = await loadPreset("python-platform");
    assert.match(preset.context ?? "", /Python 3\.10\+/);
    assert.ok(preset.rules?.verify?.some((rule) => /eval/i.test(rule)));
  });

  it("loads node-ts preset with stack context", async () => {
    const preset = await loadPreset("node-ts");
    assert.match(preset.context ?? "", /Node.js/);
    assert.equal(preset.branch_prefix, "feat");
    assert.ok(preset.rules?.implement?.length);
  });

  it("resolves extends and overrides", async () => {
    const resolved = await resolveGuardrailsConfig(
      {
        extends: "node-ts",
        context: "Team: Acme",
        overrides: {
          rules: {
            verify: ["Also run playwright e2e"],
          },
        },
      },
      loadPreset,
    );

    assert.match(resolved.context ?? "", /Node.js/);
    assert.match(resolved.context ?? "", /Team: Acme/);
    assert.ok(
      resolved.rules?.verify?.some((rule) => rule.includes("Evidence must cite test file:line")),
    );
    assert.ok(resolved.rules?.verify?.includes("Also run playwright e2e"));
  });

  it("mergeGuardrailsConfigs appends rules and context", () => {
    const merged = mergeGuardrailsConfigs(
      { context: "Base", rules: { specify: ["A"] } },
      { context: "Local", rules: { specify: ["B"] } },
    );
    assert.equal(merged.context, "Base\n\nLocal");
    assert.deepEqual(merged.rules?.specify, ["A", "B"]);
  });

  it("init-config creates extends stub for stack presets", async () => {
    const cwd = await createTempDir("init-config-ext-");
    const result = await initProjectConfig({ cwd, preset: "python" });
    assert.equal(result.created, true);

    const text = await fs.readFile(path.join(cwd, ".specs/config.yaml"), "utf8");
    assert.match(text, /extends: python/);
  });

  it("init-config writes full default preset inline", async () => {
    const cwd = await createTempDir("init-config-default-");
    await initProjectConfig({ cwd, preset: "default" });
    const text = await fs.readFile(path.join(cwd, ".specs/config.yaml"), "utf8");
    assert.doesNotMatch(text, /^extends:/m);
    assert.match(text, /schema: spec-driven/);
  });

  it("loadResolvedConfig resolves extends from disk", async () => {
    const cwd = await createTempDir("resolved-config-");
    await fs.mkdir(path.join(cwd, ".specs"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/config.yaml"),
      `extends: node-ts\n\ncontext: |\n  Team: Beta\n`,
    );

    const resolved = await loadResolvedConfig(cwd);
    assert.match(resolved?.context ?? "", /Node.js/);
    assert.match(resolved?.context ?? "", /Team: Beta/);
  });

  it("readBranchPrefix prefers explicit field", () => {
    assert.equal(readBranchPrefix({ branch_prefix: "feature" }), "feature");
    assert.equal(
      readBranchPrefix({ context: "Branch prefix: custom\n" }),
      "custom",
    );
  });

  it("init-config extends stub keeps override docs out of phase-context", async () => {
    const cwd = await createTempDir("init-config-phase-");
    await initProjectConfig({ cwd, preset: "node-ts" });

    const { phaseContext } = await import("../lib/config.js");
    const output = await phaseContext("specify", { cwd });
    assert.match(output, /Node.js/);
    assert.doesNotMatch(output, /# overrides:/);
  });

  it("feature-init uses branch prefix from resolved config", async () => {
    const cwd = await createTempDir("feature-prefix-");
    await initGuardrailsMemory(cwd);
    await initProjectConfig({ cwd, preset: "node-ts" });

    const result = await featureInit("auth flow", { cwd, skipBranch: true });
    assert.equal(result.branchName, "feat/001-auth-flow");
  });
});
