import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  doctor,
  resolveExecuteHint,
  runDoctorChecks,
  scoreDoctorChecks,
  scoreDoctorModes,
  topDoctorSuggestions,
} from "../lib/doctor.js";
import { CURSORRULES_MARKER_BEGIN, CURSORRULES_MARKER_END, SKILL_DIRS } from "../lib/constants.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function scaffoldDoctorInstall(cwd, { includeGateDeps = true } = {}) {
  await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });
  await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
  await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
  await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
  await fs.writeFile(path.join(cwd, ".specs/STATE.md"), "# State\n\n- Feature: —\n");
  await fs.writeFile(path.join(cwd, ".specs/config.yaml"), "schema: spec-driven\n");
  await fs.writeFile(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"), "---\n");

  for (const dir of SKILL_DIRS) {
    await fs.mkdir(path.join(cwd, dir), { recursive: true });
    await fs.writeFile(path.join(cwd, dir, "agent-architecture.md"), "# Hub\n");
  }

  const markerBlock = `${CURSORRULES_MARKER_BEGIN}\n# test\n${CURSORRULES_MARKER_END}\n`;
  await fs.writeFile(path.join(cwd, ".cursorrules"), markerBlock);
  await fs.writeFile(path.join(cwd, ".claude/CLAUDE.md"), markerBlock);
  await fs.writeFile(path.join(cwd, ".github/copilot-instructions.md"), markerBlock);
  await fs.writeFile(path.join(cwd, "AGENTS.md"), markerBlock);
  await fs.writeFile(path.join(cwd, ".codex/AGENTS.md"), markerBlock);

  if (includeGateDeps) {
    await fs.copyFile(
      path.join(process.cwd(), "scripts/check_commit.py"),
      path.join(cwd, ".specs/guardrails/scripts/check_commit.py"),
    );
    await fs.copyFile(
      path.join(process.cwd(), "scripts/_common.py"),
      path.join(cwd, ".specs/guardrails/scripts/_common.py"),
    );
  }
}

describe("guardrails doctor", () => {
  it("scores installed scaffold highly", async () => {
    const cwd = await createTempDir("doctor-good-");
    await scaffoldDoctorInstall(cwd);

    const checks = await runDoctorChecks(cwd);
    const score = scoreDoctorChecks(checks);
    assert.ok(score >= 80);
    assert.equal(
      checks.find((check) => check.id === "skills-hub")?.pass,
      true,
    );
  });

  it("flags missing config and suggests init-config", async () => {
    const cwd = await createTempDir("doctor-config-");
    await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/skills"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
    await fs.writeFile(path.join(cwd, ".specs/STATE.md"), "# State\n\n- Feature: —\n");
    await fs.writeFile(path.join(cwd, ".cursor/skills/agent-architecture.md"), "# Hub\n");
    await fs.writeFile(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"), "---\n");

    const checks = await runDoctorChecks(cwd);
    const config = checks.find((check) => check.id === "config");
    assert.equal(config?.pass, false);
    assert.equal(config?.optional, true);
    assert.match(config?.suggest ?? "", /init-config/);
  });

  it("Process score ignores missing config and Cursor baseline", async () => {
    const cwd = await createTempDir("doctor-process-optional-");
    await scaffoldDoctorInstall(cwd);
    await fs.rm(path.join(cwd, ".specs/config.yaml"));
    await fs.rm(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"));

    const checks = await runDoctorChecks(cwd);
    const modes = scoreDoctorModes(checks);
    assert.equal(checks.find((check) => check.id === "config")?.optional, true);
    assert.equal(checks.find((check) => check.id === "baseline-rule")?.optional, true);
    assert.ok(modes.process.score >= 80);
    assert.equal(modes.process.ready, true);
  });

  it("requires task-graph.md when active feature has 3+ tasks", async () => {
    const cwd = await createTempDir("doctor-graph-");
    const feature = "001-auth";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/skills"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n- Feature: ${feature}\n`,
    );
    await fs.writeFile(path.join(cwd, ".specs/config.yaml"), "schema: spec-driven\n");
    await fs.writeFile(path.join(cwd, ".cursor/skills/agent-architecture.md"), "# Hub\n");
    await fs.writeFile(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"), "---\n");
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: one\n\n## T2: two\n\n## T3: three\n",
    );

    const checks = await runDoctorChecks(cwd);
    const graph = checks.find((check) => check.id === "task-graph");
    assert.equal(graph?.pass, false);
    assert.match(graph?.suggest ?? "", /task-graph\.md/);
  });

  it("topDoctorSuggestions returns failed checks with remedies", () => {
    const suggestions = topDoctorSuggestions([
      { id: "a", label: "a", weight: 1, pass: true },
      { id: "b", label: "b", weight: 1, pass: false, suggest: "fix b" },
      { id: "c", label: "c", weight: 1, pass: false, suggest: "fix c" },
    ]);
    assert.deepEqual(suggestions.map((item) => item.id), ["b", "c"]);
  });

  it("suggests loop-plan when active feature has incomplete tasks", async () => {
    const cwd = await createTempDir("doctor-loop-plan-");
    const feature = "001-auth";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n- Feature: ${feature}\n`,
    );
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: login form\n\nDepends on: —\n\n## T2: session API\n\nDepends on: T1\n",
    );

    const hint = await resolveExecuteHint(cwd, feature);
    assert.match(hint ?? "", /loop-plan/);
    assert.match(hint ?? "", /001-auth/);
  });

  it("reads canonical STATE Feature line for execute hints", async () => {
    const cwd = await createTempDir("doctor-state-feature-");
    const feature = "003-trace";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/skills"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# Project State\n\n## Active Feature\n- Feature: ${feature}\n- Phase: Execute\n`,
    );
    await fs.writeFile(path.join(cwd, ".specs/config.yaml"), "schema: spec-driven\n");
    await fs.writeFile(path.join(cwd, ".cursor/skills/agent-architecture.md"), "# Hub\n");
    await fs.writeFile(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"), "---\n");
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: wire gate\n",
    );

    const logs = [];
    const original = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await doctor(cwd, { suggest: false });
      assert.match(logs.join("\n"), /Execute hint:/);
      assert.match(logs.join("\n"), /loop-plan/);
      assert.match(logs.join("\n"), /003-trace/);
    } finally {
      console.log = original;
    }
  });

  it("suggests validate-state when all tasks are complete", async () => {
    const cwd = await createTempDir("doctor-validate-state-");
    const feature = "002-export";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: csv endpoint\n\n- [x] complete\n",
    );

    const hint = await resolveExecuteHint(cwd, feature);
    assert.match(hint ?? "", /validate-state/);
  });

  it("fails platform-adapters when any contract entry is missing", async () => {
    const cwd = await createTempDir("doctor-adapters-");
    await scaffoldDoctorInstall(cwd, { includeGateDeps: false });
    await fs.rm(path.join(cwd, ".codex/AGENTS.md"));

    const checks = await runDoctorChecks(cwd);
    assert.equal(
      checks.find((check) => check.id === "platform-adapters")?.pass,
      false,
    );
  });

  it("fails skills-hub when an installed tree is missing the hub", async () => {
    const cwd = await createTempDir("doctor-hub-");
    await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/skills"), { recursive: true });
    await fs.writeFile(path.join(cwd, ".specs/STATE.md"), "# State\n", "utf8");

    const checks = await runDoctorChecks(cwd);
    assert.equal(checks.find((check) => check.id === "skills-hub")?.pass, false);
  });

  it("scores Process and Brakes modes separately", async () => {
    const cwd = await createTempDir("doctor-modes-");
    await scaffoldDoctorInstall(cwd);

    const checks = await runDoctorChecks(cwd);
    const modes = scoreDoctorModes(checks);
    assert.ok(modes.process.score >= 80);
    assert.ok(typeof modes.brakes.score === "number");
    assert.equal(typeof modes.process.ready, "boolean");
    assert.equal(typeof modes.brakes.ready, "boolean");
  });

  it("doctor human mode prints Process and Brakes scores", async () => {
    const cwd = await createTempDir("doctor-hint-output-");
    const feature = "001-auth";
    const featureDir = path.join(cwd, ".specs/features", feature);
    await fs.mkdir(featureDir, { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/skills"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".specs/STATE.md"),
      `# State\n\n- Feature: ${feature}\n`,
    );
    await fs.writeFile(path.join(cwd, ".specs/config.yaml"), "schema: spec-driven\n");
    await fs.writeFile(path.join(cwd, ".cursor/skills/agent-architecture.md"), "# Hub\n");
    await fs.writeFile(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"), "---\n");
    await fs.writeFile(
      path.join(featureDir, "tasks.md"),
      "# Tasks\n\n## T1: login form\n",
    );

    const logs = [];
    const original = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await doctor(cwd, { suggest: false });
      assert.match(logs.join("\n"), /Operating modes/);
      assert.match(logs.join("\n"), /Process:/);
      assert.match(logs.join("\n"), /Brakes:/);
      assert.match(logs.join("\n"), /Execute hint:/);
      assert.match(logs.join("\n"), /loop-plan/);
    } finally {
      console.log = original;
    }
  });

  it("doctor json mode prints structured output", async () => {
    const cwd = await createTempDir("doctor-json-");
    await fs.mkdir(path.join(cwd, ".specs/features"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/project"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".specs/guardrails/scripts"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/skills"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".cursor/rules"), { recursive: true });
    await fs.writeFile(path.join(cwd, ".specs/STATE.md"), "# State\n\n- Feature: —\n");
    await fs.writeFile(path.join(cwd, ".specs/config.yaml"), "schema: spec-driven\n");
    await fs.writeFile(path.join(cwd, ".cursor/skills/agent-architecture.md"), "# Hub\n");
    await fs.writeFile(path.join(cwd, ".cursor/rules/engineering-baseline.mdc"), "---\n");

    const logs = [];
    const original = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      const result = await doctor(cwd, { json: true });
      assert.ok(result.score >= 0);
      assert.ok(result.modes.process.score >= 0);
      assert.ok(result.modes.brakes.score >= 0);
      assert.match(logs.join("\n"), /"score"/);
      assert.match(logs.join("\n"), /"modes"/);
      assert.match(logs.join("\n"), /"pythonMissing"/);
    } finally {
      console.log = original;
    }
  });
});
