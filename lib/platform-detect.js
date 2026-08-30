import fs from "node:fs/promises";
import path from "node:path";

import { ADAPTER_REGISTRY } from "./adapter-registry.js";
import { SKILL_DIRS } from "./constants.js";

/** @typedef {"cursor" | "claude" | "copilot" | "codex"} PlatformId */

/** @type {Record<string, PlatformId>} */
export const SKILLS_DIR_TO_PLATFORM = {
  ".cursor/skills": "cursor",
  ".claude/skills": "claude",
  ".github/skills": "copilot",
  ".codex/skills": "codex",
};

/** @type {PlatformId[]} */
export const PLATFORM_IDS = ["cursor", "claude", "copilot", "codex"];

const HUB_FILE = "agent-architecture.md";

/** @type {Record<PlatformId, { env: string[], markers: string[] }>} */
const DETECTION_SIGNALS = {
  cursor: {
    env: ["CURSOR_TRACE_ID", "CURSOR_SESSION_ID", "CURSOR_AGENT", "CURSOR_CHANNEL"],
    markers: [".cursor"],
  },
  claude: {
    env: ["CLAUDE_CODE", "CLAUDE_PROJECT_DIR"],
    markers: [".claude"],
  },
  copilot: {
    env: ["GITHUB_COPILOT", "COPILOT_AGENT"],
    markers: [".github/copilot-instructions.md"],
  },
  codex: {
    env: ["CODEX_HOME", "OPENAI_CODEX"],
    markers: [".codex"],
  },
};

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Infer the active agent platform from environment variables and repo markers.
 *
 * @param {string} cwd
 * @returns {Promise<PlatformId | null>}
 */
export async function detectPlatform(cwd) {
  /** @type {{ id: PlatformId, score: number }[]} */
  const scores = [];

  for (const id of PLATFORM_IDS) {
    const signals = DETECTION_SIGNALS[id];
    let score = 0;

    for (const key of signals.env) {
      if (process.env[key]) {
        score += 10;
      }
    }

    for (const marker of signals.markers) {
      if (await pathExists(path.join(cwd, marker))) {
        score += 5;
      }
    }

    if (score > 0) {
      scores.push({ id, score });
    }
  }

  if (scores.length === 0) {
    return null;
  }

  scores.sort((a, b) => b.score - a.score);
  return scores[0].id;
}

/**
 * Skill trees that already contain a guardrails hub (preserve on IDE migration).
 *
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
export async function findExistingSkillTrees(cwd) {
  /** @type {string[]} */
  const existing = [];

  for (const dir of SKILL_DIRS) {
    if (await pathExists(path.join(cwd, dir, HUB_FILE))) {
      existing.push(dir);
    }
  }

  return existing;
}

/**
 * @param {PlatformId} platformId
 * @returns {string | null}
 */
export function skillsDirForPlatform(platformId) {
  const adapter = ADAPTER_REGISTRY.find((entry) => entry.id === platformId);
  return adapter?.skillsDir ?? null;
}

/**
 * Resolve which skill directories `install` should write to.
 *
 * @param {string} cwd
 * @param {{ allPlatforms?: boolean, platform?: PlatformId }} [options]
 * @returns {Promise<{ skillDirs: string[], detected: PlatformId | null, existing: string[] }>}
 */
export async function resolveSkillInstallTargets(cwd, options = {}) {
  if (options.allPlatforms) {
    return { skillDirs: [...SKILL_DIRS], detected: null, existing: [] };
  }

  const existing = await findExistingSkillTrees(cwd);

  if (options.platform) {
    const dir = skillsDirForPlatform(options.platform);
    if (!dir) {
      throw new Error(
        `Unknown platform: ${options.platform}. Expected one of: ${PLATFORM_IDS.join(", ")}`,
      );
    }
    return {
      skillDirs: [...new Set([dir, ...existing])],
      detected: options.platform,
      existing,
    };
  }

  const detected = await detectPlatform(cwd);
  /** @type {Set<string>} */
  const targets = new Set(existing);

  if (detected) {
    const dir = skillsDirForPlatform(detected);
    if (dir) {
      targets.add(dir);
    }
  }

  if (targets.size === 0) {
    targets.add(".cursor/skills");
  }

  return {
    skillDirs: [...targets],
    detected,
    existing,
  };
}

/**
 * Adapter entry files to install for the resolved skill targets.
 *
 * @param {string} cwd
 * @param {{ allPlatforms?: boolean, platform?: PlatformId, skillDirs?: string[] }} [options]
 * @returns {Promise<string[]>}
 */
export async function resolveAdapterInstallTargets(cwd, options = {}) {
  if (options.allPlatforms) {
    return ADAPTER_REGISTRY.map((adapter) => adapter.id);
  }

  const skillDirs =
    options.skillDirs ??
    (await resolveSkillInstallTargets(cwd, options)).skillDirs;

  /** @type {Set<string>} */
  const adapterIds = new Set(["agents-md"]);

  for (const dir of skillDirs) {
    const platformId = SKILLS_DIR_TO_PLATFORM[dir];
    if (platformId) {
      adapterIds.add(platformId);
    }
  }

  return [...adapterIds];
}

/**
 * Skill directories that should be considered "installed" for doctor checks.
 *
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
export async function resolveInstalledSkillDirs(cwd) {
  const existing = await findExistingSkillTrees(cwd);
  if (existing.length > 0) {
    return existing;
  }

  const { skillDirs } = await resolveSkillInstallTargets(cwd);
  return skillDirs;
}

/**
 * @param {string} platformArg
 * @returns {PlatformId | null}
 */
export function parsePlatformArg(platformArg) {
  const normalized = platformArg.trim().toLowerCase();
  return PLATFORM_IDS.includes(/** @type {PlatformId} */ (normalized))
    ? /** @type {PlatformId} */ (normalized)
    : null;
}
