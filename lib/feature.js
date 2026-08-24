import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { STATE_HEADER } from "./constants.js";
import { ensureDir, readFileSafe, writeFileSafe } from "./fs-utils.js";
import { loadResolvedConfig, readBranchPrefix } from "./presets.js";

const FEATURES_DIR = ".specs/features";
const FEATURE_ID_PATTERN = /^(\d{3})-([a-z0-9][a-z0-9-]*)$/;
const DEFAULT_BRANCH_PREFIX = "feat";

/**
 * @param {string} description
 * @returns {string}
 */
export function slugifyDescription(description) {
  const slug = description
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (!slug) {
    throw new Error("Description must contain at least one letter or digit.");
  }

  return slug;
}

/**
 * @param {string} cwd
 * @returns {Promise<number>}
 */
export async function nextFeatureNumber(cwd) {
  const featuresRoot = path.join(cwd, FEATURES_DIR);

  try {
    const entries = await fs.readdir(featuresRoot, { withFileTypes: true });
    let max = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const match = FEATURE_ID_PATTERN.exec(entry.name);
      if (match) {
        max = Math.max(max, Number.parseInt(match[1], 10));
      }
    }

    return max + 1;
  } catch (err) {
    if (err.code === "ENOENT") {
      return 1;
    }
    throw err;
  }
}

/**
 * @param {number} number
 * @param {string} slug
 * @returns {string}
 */
export function formatFeatureId(number, slug) {
  return `${String(number).padStart(3, "0")}-${slug}`;
}

/**
 * @param {string} featureId
 * @param {string} [prefix]
 * @returns {string}
 */
export function featureBranchName(featureId, prefix = DEFAULT_BRANCH_PREFIX) {
  return `${prefix}/${featureId}`;
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
function runCapture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

/**
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
async function isGitRepo(cwd) {
  const result = await runCapture("git", ["rev-parse", "--is-inside-work-tree"], cwd);
  return result.code === 0 && result.stdout.trim() === "true";
}

/**
 * @param {string} cwd
 * @param {string} branchName
 * @returns {Promise<{ created: boolean, message: string }>}
 */
async function ensureFeatureBranch(cwd, branchName) {
  if (!(await isGitRepo(cwd))) {
    return {
      created: false,
      message: "Not a git repository — feature folder and STATE updated; branch skipped.",
    };
  }

  const current = await runCapture("git", ["branch", "--show-current"], cwd);
  if (current.code !== 0) {
    return {
      created: false,
      message: "Could not read current git branch — branch creation skipped.",
    };
  }

  const active = current.stdout.trim();
  if (active === branchName) {
    return { created: false, message: `Already on ${branchName}.` };
  }

  const exists = await runCapture("git", ["show-ref", "--verify", `refs/heads/${branchName}`], cwd);
  if (exists.code === 0) {
    const checkout = await runCapture("git", ["checkout", branchName], cwd);
    if (checkout.code !== 0) {
      throw new Error(
        `Branch ${branchName} exists but checkout failed: ${checkout.stderr.trim() || checkout.stdout.trim()}`,
      );
    }
    return { created: false, message: `Checked out existing branch ${branchName}.` };
  }

  const create = await runCapture("git", ["checkout", "-b", branchName], cwd);
  if (create.code !== 0) {
    throw new Error(
      `Failed to create branch ${branchName}: ${create.stderr.trim() || create.stdout.trim()}`,
    );
  }

  return { created: true, message: `Created and checked out ${branchName} (Tier 0).` };
}

/**
 * @param {string} cwd
 * @param {{ featureId: string, branchName: string, phase?: string }} info
 */
async function updateStateForFeature(cwd, info) {
  const statePath = path.join(cwd, ".specs/STATE.md");
  const phase = info.phase ?? "Specify";
  const nextStep = `- [ ] Draft spec.md in .specs/features/${info.featureId}/`;

  let content;
  try {
    content = await readFileSafe(statePath);
  } catch {
    content = STATE_HEADER;
  }

  const setField = (label, value) => {
    const pattern = new RegExp(`(^-\\s*${label}:\\s*).*$`, "m");
    if (pattern.test(content)) {
      content = content.replace(pattern, `$1${value}`);
    }
  };

  setField("Feature", info.featureId);
  setField("Phase", phase);
  setField("Branch", info.branchName);

  const nextStepPattern = /^## Next Step \(single item\)\n- \[ \].*$/m;
  if (nextStepPattern.test(content)) {
    content = content.replace(nextStepPattern, `## Next Step (single item)\n${nextStep}`);
  }

  await writeFileSafe(statePath, content);
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @param {string} description
 */
async function writeSpecStub(cwd, featureId, description) {
  const specPath = path.join(cwd, FEATURES_DIR, featureId, "spec.md");
  const stub = `# Spec: ${featureId}

## Goal
${description.trim()}

## Requirements

### REQ-001: [Short title]
- **Acceptance Criteria**: WHEN [trigger] THEN the system SHALL [outcome]

## Assumptions
- none

## Out of Scope
- [Explicitly excluded work]
`;

  await writeFileSafe(specPath, stub);
}

/**
 * Allocate a unique feature directory using exclusive mkdir (race-safe).
 *
 * @param {string} cwd
 * @param {string} slug
 * @param {number} [maxAttempts]
 * @returns {Promise<{ featureId: string, featureDir: string }>}
 */
export async function allocateFeatureWorkspace(cwd, slug, maxAttempts = 10) {
  const featuresRoot = path.join(cwd, FEATURES_DIR);
  await ensureDir(featuresRoot);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const number = await nextFeatureNumber(cwd);
    const featureId = formatFeatureId(number, slug);
    const featureDirPath = path.join(featuresRoot, featureId);

    try {
      await fs.mkdir(featureDirPath);
      return { featureId, featureDir: featureDirPath };
    } catch (err) {
      if (err.code === "EEXIST") {
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `Could not allocate a unique feature id for "${slug}" after ${maxAttempts} attempts.`,
  );
}

/**
 * Initialize a numbered feature workspace (Tier 0).
 *
 * @param {string} description
 * @param {{ cwd?: string, branchPrefix?: string, skipBranch?: boolean, skipSpec?: boolean }} [options]
 */
export async function featureInit(description, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const trimmed = description?.trim();

  if (!trimmed) {
    throw new Error("Description is required. Example: feature-init \"chat with presence\"");
  }

  const slug = slugifyDescription(trimmed);
  const { featureId, featureDir: featureDirPath } = await allocateFeatureWorkspace(cwd, slug);

  const resolvedConfig = await loadResolvedConfig(cwd);
  const branchPrefix =
    options.branchPrefix ?? readBranchPrefix(resolvedConfig) ?? DEFAULT_BRANCH_PREFIX;
  const branchName = featureBranchName(featureId, branchPrefix);

  if (!options.skipSpec) {
    const specPath = path.join(featureDirPath, "spec.md");
    try {
      await fs.access(specPath);
    } catch {
      await writeSpecStub(cwd, featureId, trimmed);
    }
  }

  await updateStateForFeature(cwd, { featureId, branchName });

  let branchResult = { created: false, message: "Branch creation skipped (--no-branch)." };
  if (!options.skipBranch) {
    branchResult = await ensureFeatureBranch(cwd, branchName);
  }

  return {
    featureId,
    featureDir: path.join(FEATURES_DIR, featureId),
    branchName,
    branchCreated: branchResult.created,
    branchMessage: branchResult.message,
  };
}
