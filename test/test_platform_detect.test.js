import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, afterEach } from "node:test";

import {
  detectPlatform,
  findExistingSkillTrees,
  parsePlatformArg,
  resolveAdapterInstallTargets,
  resolveSkillInstallTargets,
} from "../lib/platform-detect.js";

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/** @type {string[]} */
const PLATFORM_ENV_KEYS = [
  "CURSOR_TRACE_ID",
  "CURSOR_SESSION_ID",
  "CURSOR_AGENT",
  "CURSOR_CHANNEL",
  "CLAUDE_CODE",
  "CLAUDE_PROJECT_DIR",
  "GITHUB_COPILOT",
  "COPILOT_AGENT",
  "CODEX_HOME",
  "OPENAI_CODEX",
];

describe("platform detection", () => {
  /** @type {Record<string, string | undefined>} */
  let savedEnv = {};

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    savedEnv = {};
  });

  function setEnv(key, value) {
    if (!(key in savedEnv)) {
      savedEnv[key] = process.env[key];
    }
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  function clearPlatformEnv() {
    for (const key of PLATFORM_ENV_KEYS) {
      setEnv(key, undefined);
    }
  }

  it("detects Cursor from environment markers", async () => {
    const cwd = await createTempDir("platform-cursor-");
    setEnv("CURSOR_TRACE_ID", "trace-123");
    try {
      assert.equal(await detectPlatform(cwd), "cursor");
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("detects Claude from .claude directory", async () => {
    clearPlatformEnv();
    const cwd = await createTempDir("platform-claude-");
    await fs.mkdir(path.join(cwd, ".claude"), { recursive: true });
    try {
      assert.equal(await detectPlatform(cwd), "claude");
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("defaults skill install to Cursor when nothing is detected", async () => {
    clearPlatformEnv();
    const cwd = await createTempDir("platform-default-");
    try {
      const { skillDirs, detected } = await resolveSkillInstallTargets(cwd);
      assert.equal(detected, null);
      assert.deepEqual(skillDirs, [".cursor/skills"]);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("preserves existing skill trees when migrating IDEs", async () => {
    const cwd = await createTempDir("platform-preserve-");
    setEnv("CURSOR_TRACE_ID", "trace-456");
    await fs.mkdir(path.join(cwd, ".claude/skills"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".claude/skills/agent-architecture.md"),
      "# Hub\n",
      "utf8",
    );

    try {
      const { skillDirs } = await resolveSkillInstallTargets(cwd);
      assert.ok(skillDirs.includes(".cursor/skills"));
      assert.ok(skillDirs.includes(".claude/skills"));
      assert.equal(skillDirs.length, 2);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("findExistingSkillTrees returns dirs with hub only", async () => {
    const cwd = await createTempDir("platform-existing-");
    await fs.mkdir(path.join(cwd, ".github/skills"), { recursive: true });
    await fs.mkdir(path.join(cwd, ".codex/skills"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, ".github/skills/agent-architecture.md"),
      "# Hub\n",
      "utf8",
    );

    try {
      assert.deepEqual(await findExistingSkillTrees(cwd), [".github/skills"]);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("--all-platforms installs every skill tree", async () => {
    const cwd = await createTempDir("platform-all-");
    try {
      const { skillDirs } = await resolveSkillInstallTargets(cwd, {
        allPlatforms: true,
      });
      assert.equal(skillDirs.length, 4);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("resolveAdapterInstallTargets follows skill targets plus AGENTS.md", async () => {
    const cwd = await createTempDir("platform-adapters-");
    try {
      const adapterIds = await resolveAdapterInstallTargets(cwd, {
        skillDirs: [".cursor/skills"],
      });
      assert.deepEqual(adapterIds.sort(), ["agents-md", "cursor"].sort());
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  });

  it("parsePlatformArg accepts known platform ids", () => {
    assert.equal(parsePlatformArg("cursor"), "cursor");
    assert.equal(parsePlatformArg("CODEX"), "codex");
    assert.equal(parsePlatformArg("unknown"), null);
  });
});
