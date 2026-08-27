import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertSafeAssetBase,
  assertSafeDownloadUrl,
  GUARDRAILS_SCRIPTS_DIR,
  LESSONS_HEADER,
  PACKAGE_VERSION,
  PINNED_REF,
  REFERENCE_ASSETS,
  REFERENCES_SUBDIR,
  resolveAssetUrl,
  RULE_ASSETS,
  SCRIPT_ASSETS,
  SKILL_ASSETS,
  STATE_HEADER,
} from "../lib/constants.js";
import { packagedAssetPath, resolveInstallSource } from "../lib/assets.js";
import { downloadToFile } from "../lib/download.js";
import { injectCursorRules } from "../lib/cursorrules.js";
import { hasPython, runGate } from "../lib/gates.js";
import { install } from "../lib/install.js";
import {
  createMockAssetServer,
  createFailingAssetServer,
  ENGINEERING_FIXTURE,
  GIT_HANDOFF_FIXTURE,
  RULES_FIXTURE,
  SECURITY_FIXTURE,
  APPSEC_FIXTURE,
  QA_STRATEGY_FIXTURE,
  CODE_SIMPLIFY_FIXTURE,
  SHIP_READY_FIXTURE,
  SKILL_FIXTURE,
  SPEC_GATE_FIXTURE,
  SPECIFY_REFERENCE_FIXTURE,
  TASK_GRAPH_FIXTURE,
} from "./helpers/mock-server.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/** @returns {Promise<boolean>} false when symlink creation is unavailable (skip the test). */
async function canCreateSymlinks() {
  const probe = await createTempDir("symlink-probe-");
  try {
    const target = path.join(probe, "target.txt");
    await fs.writeFile(target, "probe", "utf8");
    await fs.symlink(target, path.join(probe, "link.txt"));
    return true;
  } catch (err) {
    if (err.code === "EPERM" || err.code === "ENOTSUP") {
      return false;
    }
    throw err;
  } finally {
    await fs.rm(probe, { recursive: true, force: true });
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withMockServer(fn, options) {
  if (options?.statusCode && options.statusCode !== 200) {
    const mockServer = await createFailingAssetServer(options.statusCode);
    try {
      await fn(mockServer);
    } finally {
      await mockServer.close();
    }
    return;
  }

  const mockServer = await createMockAssetServer(options?.fixtures, {
    redirects: options?.redirects,
  });
  try {
    await fn(mockServer);
  } finally {
    await mockServer.close();
  }
}

describe("install guardrails", () => {
  it("creates the full guardrails structure in the target project", async () => {
    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-install-");

      try {
        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        const cursorSkill = path.join(
          cwd,
          ".cursor/skills/agent-architecture.md",
        );
        const engineeringSkill = path.join(
          cwd,
          ".cursor/skills/engineering-standards.md",
        );
        const securitySkill = path.join(
          cwd,
          ".cursor/skills/security-review.md",
        );
        const appsecSkill = path.join(cwd, ".cursor/skills/appsec.md");
        const qaSkill = path.join(cwd, ".cursor/skills/qa-strategy.md");
        const codeSimplifySkill = path.join(
          cwd,
          ".cursor/skills/code-simplify.md",
        );
        const shipReadySkill = path.join(cwd, ".cursor/skills/ship-ready.md");
        const gitHandoffSkill = path.join(
          cwd,
          ".cursor/skills/git-handoff.md",
        );
        const taskGraphSkill = path.join(
          cwd,
          ".cursor/skills/task-graph-engineering.md",
        );
        const claudeSkill = path.join(
          cwd,
          ".claude/skills/agent-architecture.md",
        );
        const baselineRule = path.join(
          cwd,
          ".cursor/rules/engineering-baseline.mdc",
        );
        const stateFile = path.join(cwd, ".specs/STATE.md");
        const lessonsFile = path.join(cwd, ".specs/LESSONS.md");
        const featuresDir = path.join(cwd, ".specs/features");
        const gettingStarted = path.join(cwd, ".specs/GETTING_STARTED.md");
        const cursorRules = path.join(cwd, ".cursorrules");

        assert.equal(await pathExists(cursorSkill), true);
        assert.equal(await pathExists(engineeringSkill), true);
        assert.equal(await pathExists(securitySkill), true);
        assert.equal(await pathExists(appsecSkill), true);
        assert.equal(await pathExists(qaSkill), true);
        assert.equal(await pathExists(codeSimplifySkill), true);
        assert.equal(await pathExists(shipReadySkill), true);
        assert.equal(await pathExists(gitHandoffSkill), true);
        assert.equal(await pathExists(taskGraphSkill), true);
        assert.equal(await pathExists(claudeSkill), true);
        assert.equal(await pathExists(baselineRule), true);
        assert.equal(await pathExists(featuresDir), true);
        assert.equal(await pathExists(gettingStarted), true);
        assert.match(await fs.readFile(gettingStarted, "utf8"), /do \*\*not\*\* need to memorize CLI/);
        assert.equal(await pathExists(cursorRules), true);
        assert.equal(await pathExists(path.join(cwd, ".claude/CLAUDE.md")), true);
        assert.match(
          await fs.readFile(path.join(cwd, ".claude/CLAUDE.md"), "utf8"),
          /SPEC-GUARDRAILS:BEGIN/,
        );
        assert.equal(
          await pathExists(path.join(cwd, ".github/copilot-instructions.md")),
          true,
        );
        assert.match(
          await fs.readFile(
            path.join(cwd, ".github/copilot-instructions.md"),
            "utf8",
          ),
          /\.github\/skills\/agent-architecture\.md/,
        );
        assert.equal(await pathExists(path.join(cwd, "AGENTS.md")), true);
        assert.equal(await pathExists(path.join(cwd, ".codex/AGENTS.md")), true);
        assert.match(
          await fs.readFile(path.join(cwd, ".codex/AGENTS.md"), "utf8"),
          /\.codex\/skills\/agent-architecture\.md/,
        );

        assert.equal(await fs.readFile(cursorSkill, "utf8"), SKILL_FIXTURE);
        assert.equal(
          await fs.readFile(engineeringSkill, "utf8"),
          ENGINEERING_FIXTURE,
        );
        assert.equal(
          await fs.readFile(securitySkill, "utf8"),
          SECURITY_FIXTURE,
        );
        assert.equal(await fs.readFile(appsecSkill, "utf8"), APPSEC_FIXTURE);
        assert.equal(await fs.readFile(qaSkill, "utf8"), QA_STRATEGY_FIXTURE);
        assert.equal(
          await fs.readFile(codeSimplifySkill, "utf8"),
          CODE_SIMPLIFY_FIXTURE,
        );
        assert.equal(
          await fs.readFile(shipReadySkill, "utf8"),
          SHIP_READY_FIXTURE,
        );
        assert.equal(
          await fs.readFile(gitHandoffSkill, "utf8"),
          GIT_HANDOFF_FIXTURE,
        );
        assert.equal(
          await fs.readFile(taskGraphSkill, "utf8"),
          TASK_GRAPH_FIXTURE,
        );
        assert.equal(await fs.readFile(claudeSkill, "utf8"), SKILL_FIXTURE);
        assert.equal(await fs.readFile(baselineRule, "utf8"), RULES_FIXTURE);
        assert.equal(await fs.readFile(stateFile, "utf8"), STATE_HEADER);
        assert.equal(await fs.readFile(lessonsFile, "utf8"), LESSONS_HEADER);

        const rulesContent = await fs.readFile(cursorRules, "utf8");
        assert.match(rulesContent, /agent-architecture\.md/);
        assert.match(rulesContent, /engineering-standards\.md/);
        assert.match(rulesContent, /security-review\.md/);
        assert.match(rulesContent, /classify-change/);
        assert.match(rulesContent, /feature-status/);
        assert.match(rulesContent, /Sister skills/);
        assert.match(rulesContent, /task-graph-engineering\.md/);
        assert.match(rulesContent, /engineering-baseline\.mdc/);
        assert.match(rulesContent, /references\//);
        assert.match(rulesContent, /guardrails\/scripts/);
        assert.match(rulesContent, /GETTING_STARTED\.md/);
        assert.doesNotMatch(rulesContent, /pt-BR/);
      } finally {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("installs phase references for both agents", async () => {
    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-references-");

      try {
        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        for (const dir of [
          ".cursor/skills",
          ".claude/skills",
          ".github/skills",
          ".codex/skills",
        ]) {
          for (const reference of REFERENCE_ASSETS) {
            const referencePath = path.join(
              cwd,
              dir,
              REFERENCES_SUBDIR,
              reference.file,
            );
            assert.equal(
              await pathExists(referencePath),
              true,
              `missing ${dir}/${REFERENCES_SUBDIR}/${reference.file}`,
            );
          }
        }

        const specifyReference = path.join(
          cwd,
          ".cursor/skills",
          REFERENCES_SUBDIR,
          "specify.md",
        );
        assert.equal(
          await fs.readFile(specifyReference, "utf8"),
          SPECIFY_REFERENCE_FIXTURE,
        );
      } finally {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("installs executable gate scripts under .specs/guardrails/scripts", async () => {
    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-gates-");

      try {
        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        for (const script of SCRIPT_ASSETS) {
          const scriptPath = path.join(cwd, GUARDRAILS_SCRIPTS_DIR, script.file);
          assert.equal(
            await pathExists(scriptPath),
            true,
            `missing gate script ${script.file}`,
          );
        }

        const specGate = path.join(
          cwd,
          GUARDRAILS_SCRIPTS_DIR,
          "validate_spec.py",
        );
        assert.equal(await fs.readFile(specGate, "utf8"), SPEC_GATE_FIXTURE);

        const mode = (await fs.stat(specGate)).mode & 0o777;
        // Windows does not preserve Unix execute bits the same way; skip on win32.
        if (process.platform !== "win32") {
          assert.equal(
            (mode & 0o100) !== 0,
            true,
            `gate script should be executable, got ${mode.toString(8)}`,
          );
        } else {
          assert.ok(typeof mode === "number");
        }
      } finally {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("installs from packaged assets without a network fetch", async () => {
    const cwd = await createTempDir("harness-offline-");
    const originalOverride = process.env.SPEC_GUARDRAILS_REPO_URL;
    delete process.env.SPEC_GUARDRAILS_REPO_URL;

    try {
      await install({ cwd, silent: true });

      const hub = await fs.readFile(
        path.join(cwd, ".cursor/skills/agent-architecture.md"),
        "utf8",
      );
      assert.match(hub, /# Agent Architecture/);
      assert.doesNotMatch(hub, /test fixture/);

      const specGate = await fs.readFile(
        path.join(cwd, GUARDRAILS_SCRIPTS_DIR, "validate_spec.py"),
        "utf8",
      );
      assert.match(specGate, /SHALL or MUST/);

      const lessonsEngine = await fs.readFile(
        path.join(cwd, GUARDRAILS_SCRIPTS_DIR, "lessons.py"),
        "utf8",
      );
      assert.match(lessonsEngine, /def cmd_add/);

      const contextLimits = await fs.readFile(
        path.join(cwd, ".cursor/skills", REFERENCES_SUBDIR, "context-limits.md"),
        "utf8",
      );
      assert.match(contextLimits, /# Context Limits/);
    } finally {
      if (originalOverride === undefined) {
        delete process.env.SPEC_GUARDRAILS_REPO_URL;
      } else {
        process.env.SPEC_GUARDRAILS_REPO_URL = originalOverride;
      }
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("offline reinstall refreshes skills but keeps memory and user rule prose", async () => {
    const cwd = await createTempDir("harness-offline-rerun-");
    const originalOverride = process.env.SPEC_GUARDRAILS_REPO_URL;
    delete process.env.SPEC_GUARDRAILS_REPO_URL;

    try {
      await install({ cwd, silent: true });

      const lessonsFile = path.join(cwd, ".specs/LESSONS.md");
      const stateFile = path.join(cwd, ".specs/STATE.md");
      const baselineRule = path.join(
        cwd,
        ".cursor/rules/engineering-baseline.mdc",
      );
      await fs.writeFile(lessonsFile, "# Custom lessons\n", "utf8");
      await fs.writeFile(stateFile, "# Custom state\n", "utf8");
      await fs.writeFile(baselineRule, "# Custom rules\n", "utf8");

      await install({ cwd, silent: true });

      assert.equal(await fs.readFile(lessonsFile, "utf8"), "# Custom lessons\n");
      assert.equal(await fs.readFile(stateFile, "utf8"), "# Custom state\n");
      const baseline = await fs.readFile(baselineRule, "utf8");
      assert.match(baseline, /# Custom rules/);
      assert.match(baseline, /guardrails-managed:skills-map:start/);
      assert.match(baseline, /appsec\.md/);
      assert.match(baseline, /GETTING_STARTED\.md/);

      const hub = await fs.readFile(
        path.join(cwd, ".cursor/skills/agent-architecture.md"),
        "utf8",
      );
      assert.match(hub, /# Agent Architecture/);
    } finally {
      if (originalOverride === undefined) {
        delete process.env.SPEC_GUARDRAILS_REPO_URL;
      } else {
        process.env.SPEC_GUARDRAILS_REPO_URL = originalOverride;
      }
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("does not overwrite existing STATE.md or LESSONS.md; refreshes skills map in rules", async () => {
    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-idempotent-");

      try {
        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        const stateFile = path.join(cwd, ".specs/STATE.md");
        const lessonsFile = path.join(cwd, ".specs/LESSONS.md");
        const baselineRule = path.join(
          cwd,
          ".cursor/rules/engineering-baseline.mdc",
        );

        await fs.writeFile(stateFile, "# Custom state\n", "utf8");
        await fs.writeFile(lessonsFile, "# Custom lessons\n", "utf8");
        await fs.writeFile(baselineRule, "# Custom rules\n", "utf8");

        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        assert.equal(await fs.readFile(stateFile, "utf8"), "# Custom state\n");
        assert.equal(
          await fs.readFile(lessonsFile, "utf8"),
          "# Custom lessons\n",
        );
        const baseline = await fs.readFile(baselineRule, "utf8");
        assert.match(baseline, /# Custom rules/);
        assert.match(baseline, /qa-strategy\.md/);
      } finally {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("reinstall refreshes a stale Guardrails Skills table without markers", async () => {
    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-baseline-stale-");

      try {
        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        const baselineRule = path.join(
          cwd,
          ".cursor/rules/engineering-baseline.mdc",
        );
        await fs.writeFile(
          baselineRule,
          `# Engineering Baseline

# Guardrails Skills

| Skill | Purpose |
| --- | --- |
| \`.cursor/skills/agent-architecture.md\` | hub only |

# Deterministic Gates

keep me
`,
          "utf8",
        );

        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        const baseline = await fs.readFile(baselineRule, "utf8");
        assert.match(baseline, /guardrails-managed:skills-map:start/);
        assert.match(baseline, /appsec\.md/);
        assert.match(baseline, /# Deterministic Gates/);
        assert.match(baseline, /keep me/);
      } finally {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("upgrades an outdated .cursorrules guardrails block on re-run", async () => {
    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-cursorrules-upgrade-");

      try {
        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        const cursorRules = path.join(cwd, ".cursorrules");
        await fs.writeFile(
          cursorRules,
          `<!-- AGENTIC-HARNESS:BEGIN -->
# Old block
- \`.cursor/skills/agent-architecture.md\`
<!-- AGENTIC-HARNESS:END -->
`,
          "utf8",
        );

        await install({ cwd, repoUrl: mockServer.baseUrl, silent: true });

        const rulesContent = await fs.readFile(cursorRules, "utf8");
        assert.match(rulesContent, /engineering-standards\.md/);
        assert.match(rulesContent, /security-review\.md/);
        assert.match(rulesContent, /classify-change/);
        assert.match(rulesContent, /feature-status/);
        assert.match(rulesContent, /Sister skills/);
        assert.match(rulesContent, /task-graph-engineering\.md/);
        assert.match(rulesContent, /engineering-baseline\.mdc/);
        assert.match(rulesContent, /GETTING_STARTED\.md/);
        assert.doesNotMatch(rulesContent, /# Old block/);
        assert.match(rulesContent, /SPEC-GUARDRAILS:BEGIN/);
      } finally {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("throws a descriptive error when download fails", async () => {
    await withMockServer(
      async (failingServer) => {
        const cwd = await createTempDir("harness-download-fail-");

        try {
          await assert.rejects(
            () =>
              install({
                cwd,
                repoUrl: failingServer.baseUrl,
                silent: true,
              }),
            (err) => {
              assert.match(err.message, /Download failed: 404/);
              return true;
            },
          );

          const partialSkill = path.join(
            cwd,
            ".cursor/skills/agent-architecture.md",
          );
          assert.equal(await pathExists(partialSkill), false);
        } finally {
          await fs.rm(cwd, { recursive: true, force: true });
        }
      },
      { statusCode: 404 },
    );
  });

  it("throws a clear permission error when directory creation is denied", async (t) => {
    if (process.platform === "win32") {
      t.skip("POSIX directory permission denial is not reliable on Windows");
      return;
    }

    await withMockServer(async (mockServer) => {
      const cwd = await createTempDir("harness-permission-");
      const blockedDir = path.join(cwd, "blocked");
      await fs.mkdir(blockedDir, { recursive: true });
      await fs.chmod(blockedDir, 0o444);

      try {
        await assert.rejects(
          () =>
            install({
              cwd: blockedDir,
              repoUrl: mockServer.baseUrl,
              silent: true,
            }),
          (err) => {
            assert.match(err.message, /Permission denied/);
            return true;
          },
        );
      } finally {
        await fs.chmod(blockedDir, 0o755);
        await fs.rm(cwd, { recursive: true, force: true });
      }
    });
  });

  it("refuses to create STATE.md through a dangling symlink", async (t) => {
    if (process.platform === "win32" || !(await canCreateSymlinks())) {
      t.skip("Symlink security checks are not reliable in this environment");
      return;
    }
    const cwd = await createTempDir("ah-state-symlink-");
    const secret = path.join(cwd, "secret.env");
    await fs.mkdir(path.join(cwd, ".specs", "features"), { recursive: true });
    await fs.symlink(secret, path.join(cwd, ".specs", "STATE.md"));

    try {
      await assert.rejects(
        () => install({ cwd, silent: true }),
        /symlink/,
      );
      assert.equal(await pathExists(secret), false);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("refuses to write .cursorrules through a symlink", async (t) => {
    if (process.platform === "win32" || !(await canCreateSymlinks())) {
      t.skip("Symlink security checks are not reliable in this environment");
      return;
    }
    const cwd = await createTempDir("ah-rules-symlink-");
    const secret = path.join(cwd, "secret.env");
    await fs.writeFile(secret, "SECRET=keep\n", "utf8");
    await fs.symlink(secret, path.join(cwd, ".cursorrules"));

    try {
      await assert.rejects(
        () => install({ cwd, silent: true }),
        /symlink/,
      );
      assert.equal(await fs.readFile(secret, "utf8"), "SECRET=keep\n");
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("refuses to install when .specs is a symlinked directory", async (t) => {
    if (process.platform === "win32" || !(await canCreateSymlinks())) {
      t.skip("Symlink security checks are not reliable in this environment");
      return;
    }
    const cwd = await createTempDir("ah-specs-parent-symlink-");
    const outside = path.join(cwd, "outside");
    await fs.mkdir(outside, { recursive: true });
    await fs.symlink(outside, path.join(cwd, ".specs"));

    try {
      await assert.rejects(
        () => install({ cwd, silent: true }),
        /symlinked directory/,
      );
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });
});

describe("asset source safety", () => {
  it("pins remote asset URLs to the released tag", () => {
    const url = resolveAssetUrl("skills/agent-architecture.md");

    assert.match(url, /\/spec-guardrails\/v\d+\.\d+\.\d+\//);
    assert.ok(url.startsWith("https://"), `expected https, got ${url}`);
    assert.ok(
      url.includes(`/${PINNED_REF}/`),
      `expected the pinned ref ${PINNED_REF} in ${url}`,
    );
  });

  it("rejects plain HTTP sources outside localhost", () => {
    assert.throws(
      () => assertSafeAssetBase("http://evil.example.com/assets"),
      /only HTTPS sources are allowed/,
    );
  });

  it("allows HTTP against a local host so the suite can serve fixtures", () => {
    assert.equal(
      assertSafeAssetBase("http://127.0.0.1:8080/"),
      "http://127.0.0.1:8080",
    );
  });

  it("rejects malformed asset bases", () => {
    assert.throws(
      () => assertSafeAssetBase("not-a-url"),
      /Invalid guardrails asset URL/,
    );
  });

  it("warns before installing from an overridden source", async () => {
    const mockServer = await createMockAssetServer();
    const cwd = await createTempDir("harness-override-");
    const logs = [];
    const originalOverride = process.env.SPEC_GUARDRAILS_REPO_URL;
    delete process.env.SPEC_GUARDRAILS_REPO_URL;
    process.env.SPEC_GUARDRAILS_REPO_URL = mockServer.baseUrl;

    try {
      const originalLog = console.log;
      console.log = (message) => logs.push(String(message));

      try {
        await install({ cwd });
      } finally {
        console.log = originalLog;
      }

      assert.ok(
        logs.some((line) => line.includes("SPEC_GUARDRAILS_REPO_URL is set")),
        `expected an override warning, got:\n${logs.join("\n")}`,
      );
    } finally {
      if (originalOverride === undefined) {
        delete process.env.SPEC_GUARDRAILS_REPO_URL;
      } else {
        process.env.SPEC_GUARDRAILS_REPO_URL = originalOverride;
      }
      await fs.rm(cwd, { recursive: true, force: true });
      await mockServer.close();
    }
  });
});

describe("cursorrules maintenance", () => {
  it("preserves user formatting when upgrading the guardrails block", async () => {
    const cwd = await createTempDir("harness-cursorrules-format-");
    const rulesPath = path.join(cwd, ".cursorrules");
    const userContent = "# My rules\n\n\n\nSection A\n\n\n\nSection B\n";

    try {
      await fs.writeFile(rulesPath, userContent, "utf8");
      await injectCursorRules(cwd);

      const withStaleBlock = (await fs.readFile(rulesPath, "utf8")).replace(
        /<!-- SPEC-GUARDRAILS:BEGIN -->[\s\S]*?<!-- SPEC-GUARDRAILS:END -->/,
        "<!-- AGENTIC-HARNESS:BEGIN -->\n# old\n<!-- AGENTIC-HARNESS:END -->",
      );
      await fs.writeFile(rulesPath, withStaleBlock, "utf8");

      await injectCursorRules(cwd);
      await injectCursorRules(cwd);

      const content = await fs.readFile(rulesPath, "utf8");

      assert.ok(
        content.includes("\n\n\n\nSection A"),
        "user blank lines outside the guardrails block must survive an upgrade",
      );
      assert.equal(
        (content.match(/SPEC-GUARDRAILS:BEGIN/g) ?? []).length,
        1,
        "repeated runs must not duplicate the guardrails block",
      );
      assert.match(content, /guardrails\/scripts/);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });
});

describe("gate execution", () => {
  it("explains how to install when the gate script is missing", async () => {
    const cwd = await createTempDir("harness-missing-gate-");

    try {
      await assert.rejects(
        () => runGate("validate-spec", ["spec.md"], { cwd }),
        /Run `npx @luizsantiago\/spec-guardrails install`/,
      );
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("runs gate scripts with options.cwd as the working directory", async (t) => {
    if (!(await hasPython())) {
      t.skip("Python 3 not found");
      return;
    }

    const cwd = await createTempDir("harness-gate-cwd-");

    try {
      await install({ cwd, silent: true });

      const featureDir = path.join(cwd, ".specs/features/001-auth");
      await fs.mkdir(featureDir, { recursive: true });
      await fs.writeFile(
        path.join(featureDir, "spec.md"),
        `# Spec: Authentication

## Goal
Let users sign in with email and password.

## Requirements

### REQ-001: Email login
- **Acceptance Criteria**: WHEN a user submits valid credentials THEN the system SHALL create a session

## Assumptions
- Email is the only identity provider for this feature

## Out of Scope
- Social login providers
`,
        "utf8",
      );

      const code = await runGate("validate-spec", ["001-auth"], {
        cwd,
        stdio: "ignore",
      });
      assert.equal(code, 0);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });
});

describe("packaged assets", () => {
  it("declares skills, rules and scripts in the npm package files list", async () => {
    const pkg = JSON.parse(
      await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
    );
    for (const entry of [
      "index.js",
      "lib/",
      "skills/",
      "rules/",
      "scripts/*.py",
      "templates/",
      "LICENSE",
    ]) {
      assert.ok(pkg.files.includes(entry), `package.json files missing ${entry}`);
    }
  });

  it("README version series matches package.json major.minor", async () => {
    const readme = await fs.readFile(
      new URL("../README.md", import.meta.url),
      "utf8",
    );
    const [major, minor] = PACKAGE_VERSION.split(".");
    const series = `${major}.${minor}.x`;
    assert.match(
      readme,
      new RegExp(`\\*\\*${series.replaceAll(".", "\\.")}\\*\\*`),
    );
    // A pinned patch here fails `prepublishOnly` after `npm version` bumps package.json.
    assert.doesNotMatch(readme, /current \*\*\d+\.\d+\.\d+\*\*/);
  });

  it("resolves install to the package when no override is set", () => {
    const original = process.env.SPEC_GUARDRAILS_REPO_URL;
    delete process.env.SPEC_GUARDRAILS_REPO_URL;
    try {
      assert.deepEqual(resolveInstallSource(), { mode: "package" });
      assert.equal(
        resolveInstallSource("https://example.com/raw").mode,
        "remote",
      );
      assert.throws(
        () => resolveInstallSource("http://evil.example.com/assets"),
        /only HTTPS sources are allowed/,
      );
    } finally {
      if (original === undefined) {
        delete process.env.SPEC_GUARDRAILS_REPO_URL;
      } else {
        process.env.SPEC_GUARDRAILS_REPO_URL = original;
      }
    }
  });

  it("ships every catalogued asset inside the package", async () => {
    for (const asset of [
      ...SKILL_ASSETS,
      ...REFERENCE_ASSETS,
      ...SCRIPT_ASSETS,
      ...RULE_ASSETS,
    ]) {
      await fs.access(packagedAssetPath(asset.remotePath));
    }
  });
});

describe("download safety", () => {
  it("follows same-host redirects that stay on an allowed URL", async () => {
    await withMockServer(
      async (mockServer) => {
        const dest = path.join(await createTempDir("ah-redir-ok-"), "asset.md");
        await downloadToFile(
          `${mockServer.baseUrl}/skills/agent-architecture.md`,
          dest,
        );
        const body = await fs.readFile(dest, "utf8");
        assert.match(body, /Agent Architecture/);
        await fs.rm(path.dirname(dest), { recursive: true, force: true });
      },
      {
        redirects: {
          "/skills/agent-architecture.md": "/skills/agent-architecture.md?ok=1",
        },
        fixtures: {
          "/skills/agent-architecture.md?ok=1": SKILL_FIXTURE,
        },
      },
    );
  });

  it("rejects a redirect hop to a disallowed host", async () => {
    await withMockServer(
      async (mockServer) => {
        const dest = path.join(
          await createTempDir("ah-redir-bad-"),
          "asset.md",
        );
        await assert.rejects(
          () =>
            downloadToFile(
              `${mockServer.baseUrl}/skills/agent-architecture.md`,
              dest,
            ),
          /disallowed URL|only HTTPS sources are allowed/,
        );
        assert.equal(await pathExists(dest), false);
        await fs.rm(path.dirname(dest), { recursive: true, force: true });
      },
      {
        redirects: {
          "/skills/agent-architecture.md": "http://evil.example.com/payload",
        },
      },
    );
  });

  it("rejects a cross-origin redirect hop, including another local port", () => {
    assert.throws(
      () =>
        assertSafeDownloadUrl(
          "http://127.0.0.1:6379/payload",
          "http://127.0.0.1:8080/skills/agent-architecture.md",
        ),
      /cross-origin redirect/,
    );
  });

  it("allows a same-origin redirect hop", () => {
    assert.equal(
      assertSafeDownloadUrl(
        "http://127.0.0.1:8080/b.md",
        "http://127.0.0.1:8080/a.md",
      ),
      "http://127.0.0.1:8080/b.md",
    );
  });

  it("rejects a redirect hop to a different local port", async () => {
    const other = await createMockAssetServer();
    try {
      await withMockServer(
        async (mockServer) => {
          const dest = path.join(
            await createTempDir("ah-redir-port-"),
            "asset.md",
          );
          await assert.rejects(
            () =>
              downloadToFile(
                `${mockServer.baseUrl}/skills/agent-architecture.md`,
                dest,
              ),
            /disallowed URL|cross-origin redirect/,
          );
          assert.equal(await pathExists(dest), false);
          await fs.rm(path.dirname(dest), { recursive: true, force: true });
        },
        {
          redirects: {
            "/skills/agent-architecture.md": `${other.baseUrl}/skills/agent-architecture.md`,
          },
        },
      );
    } finally {
      await other.close();
    }
  });

  it("refuses to overwrite a destination symlink", async (t) => {
    if (process.platform === "win32" || !(await canCreateSymlinks())) {
      t.skip("Symlink security checks are not reliable in this environment");
      return;
    }
    const cwd = await createTempDir("ah-symlink-");
    const secret = path.join(cwd, "secret.env");
    const link = path.join(cwd, "skill.md");
    await fs.writeFile(secret, "SECRET=keep\n", "utf8");
    await fs.symlink(secret, link);

    await withMockServer(async (mockServer) => {
      await assert.rejects(
        () =>
          downloadToFile(
            `${mockServer.baseUrl}/skills/agent-architecture.md`,
            link,
          ),
        /Refusing to write through symlink/,
      );
      assert.equal(await fs.readFile(secret, "utf8"), "SECRET=keep\n");
    });

    await fs.rm(cwd, { recursive: true, force: true });
  });

  it("rejects packaged paths that escape the package root", () => {
    assert.throws(
      () => packagedAssetPath("../outside.md"),
      /outside package root/,
    );
    assert.throws(
      () => packagedAssetPath("skills/../../outside.md"),
      /outside package root/,
    );
  });

  it("assertSafeDownloadUrl matches the HTTPS policy", () => {
    assert.equal(
      assertSafeDownloadUrl("https://example.com/a.md"),
      "https://example.com/a.md",
    );
    assert.throws(
      () => assertSafeDownloadUrl("http://evil.example.com/a.md"),
      /only HTTPS sources are allowed/,
    );
  });
});

describe("reference catalog", () => {
  it("includes v0.8 phase procedures and gate scripts", () => {
    for (const file of [
      "explore.md",
      "elicitation.md",
      "project-init.md",
      "constitution.md",
      "analyze.md",
      "converge.md",
      "archive.md",
      "context-limits.md",
      "lessons.md",
      "sub-agents.md",
      "solution-exploration.md",
    ]) {
      assert.equal(
        REFERENCE_ASSETS.some((asset) => asset.file === file),
        true,
        `missing reference asset ${file}`,
      );
    }

    assert.equal(REFERENCE_ASSETS.length, 19);
    assert.equal(
      SCRIPT_ASSETS.some((asset) => asset.file === "lessons.py"),
      true,
    );
    assert.equal(
      SCRIPT_ASSETS.some((asset) => asset.file === "loop_plan.py"),
      true,
    );
    assert.equal(
      SCRIPT_ASSETS.some((asset) => asset.file === "analyze_artifacts.py"),
      true,
    );
    assert.equal(
      SCRIPT_ASSETS.some((asset) => asset.file === "validate_traceability.py"),
      true,
    );
    assert.equal(
      SCRIPT_ASSETS.some((asset) => asset.file === "validate_quick.py"),
      true,
    );
  });
});

describe("shipped baseline", () => {
  it("installs analyze gate, config example, and project dirs from package", async () => {
    const cwd = await createTempDir("baseline-shipped-");

    try {
      await install({ cwd, silent: true });

      const baseline = await fs.readFile(
        path.join(cwd, ".cursor/rules/engineering-baseline.mdc"),
        "utf8",
      );
      assert.match(baseline, /GETTING_STARTED\.md/);
      assert.match(baseline, /feature-init/);
      assert.match(baseline, /explore/);

      assert.equal(
        await pathExists(path.join(cwd, ".specs/config.yaml.example")),
        true,
      );
      assert.equal(await pathExists(path.join(cwd, ".specs/project")), true);
      assert.equal(await pathExists(path.join(cwd, ".specs/domains")), true);
      assert.equal(
        await pathExists(
          path.join(cwd, GUARDRAILS_SCRIPTS_DIR, "analyze_artifacts.py"),
        ),
        true,
      );
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });
});

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("../index.js", import.meta.url)), ...args],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("CLI", () => {
  it("prints the package version", async () => {
    const { code, stdout } = await runCli(["--version"]);
    assert.equal(code, 0);
    assert.equal(stdout.trim(), PACKAGE_VERSION);
  });

  it("prints usage on --help and exits 0", async () => {
    const { code, stdout, stderr } = await runCli(["--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /Usage: spec-guardrails/);
    assert.equal(stderr, "");
  });

  it("prints usage on stderr when no command is given", async () => {
    const { code, stdout, stderr } = await runCli([]);
    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.match(stderr, /Usage: spec-guardrails/);
  });

  it("lists project-init, preset, init-config, archive-feature, phase-context, doctor, and loop-plan in help", async () => {
    const { code, stdout } = await runCli(["--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /project-init/);
    assert.match(stdout, /loop-plan/);
    assert.match(stdout, /feature-init/);
    assert.match(stdout, /archive-feature/);
    assert.match(stdout, /phase-context/);
    assert.match(stdout, /init-config/);
    assert.match(stdout, /preset list/);
    assert.match(stdout, /analyze-artifacts/);
    assert.match(stdout, /validate-traceability/);
    assert.match(stdout, /validate-quick/);
    assert.match(stdout, /classify-change/);
    assert.match(stdout, /feature-status/);
    assert.match(stdout, /doctor/);
  });
});
