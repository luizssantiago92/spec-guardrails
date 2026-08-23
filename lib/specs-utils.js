import fs from "node:fs/promises";
import path from "node:path";

import { readFileSafe } from "./fs-utils.js";
import { isValidFeatureId } from "./slug-utils.js";

const FEATURES_DIR = ".specs/features";

/**
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
export async function listFeatureIds(cwd) {
  const featuresRoot = path.join(cwd, FEATURES_DIR);

  try {
    const entries = await fs.readdir(featuresRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && isValidFeatureId(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * @param {string} trimmed
 * @param {string} cwd
 * @returns {Promise<string>}
 */
async function resolveFeatureIdFromPath(trimmed, cwd) {
  const asPath = path.resolve(cwd, trimmed);
  const featuresRoot = path.resolve(cwd, FEATURES_DIR);
  const relative = path.relative(featuresRoot, asPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`No such feature or path: ${trimmed}`);
  }

  const featureId = relative.split(path.sep)[0];
  if (!isValidFeatureId(featureId)) {
    throw new Error(`No such feature or path: ${trimmed}`);
  }

  const named = path.join(featuresRoot, featureId);
  try {
    const stat = await fs.stat(named);
    if (stat.isDirectory()) {
      return featureId;
    }
  } catch {
    // fall through
  }

  throw new Error(`No such feature or path: ${trimmed}`);
}

/**
 * @param {string | undefined} raw
 * @param {string} cwd
 * @returns {Promise<string>}
 */
export async function resolveFeatureId(raw, cwd) {
  if (raw?.trim()) {
    const trimmed = raw.trim();

    if (trimmed.endsWith(".md") || trimmed.includes("/") || trimmed.includes("\\")) {
      return resolveFeatureIdFromPath(trimmed, cwd);
    }

    if (!isValidFeatureId(trimmed)) {
      throw new Error(`Invalid feature id: ${trimmed} (expected NNN-slug)`);
    }

    const named = path.join(cwd, FEATURES_DIR, trimmed);
    try {
      const stat = await fs.stat(named);
      if (stat.isDirectory()) {
        return trimmed;
      }
    } catch {
      // fall through
    }

    throw new Error(`No such feature or path: ${trimmed}`);
  }

  const active = await readActiveFeatureFromState(cwd);
  if (active && active !== "—") {
    if (!isValidFeatureId(active)) {
      throw new Error(`Invalid active feature in STATE.md: ${active}`);
    }
    return active;
  }

  const features = await listFeatureIds(cwd);
  if (features.length === 1) {
    return features[0];
  }

  if (features.length === 0) {
    throw new Error("No features found — create .specs/features/[feature]/ first.");
  }

  throw new Error(
    `${features.length} features found — name the one to use:\n` +
      features.map((id) => `  ${id}`).join("\n"),
  );
}

/**
 * @param {string} cwd
 * @returns {Promise<string | null>}
 */
export async function readActiveFeatureFromState(cwd) {
  const statePath = path.join(cwd, ".specs/STATE.md");

  try {
    const content = await readFileSafe(statePath);
    // Canonical STATE_HEADER uses "- Feature:". Older fixtures used "- **Active feature**:".
    const match =
      content.match(/^-\s*Feature:\s*(.+)$/m) ??
      content.match(/^\s*[-*]\s*\*\*Active feature\*\*:\s*(.+)$/im);
    if (!match) {
      return null;
    }
    const value = match[1].trim().replace(/^`|`$/g, "");
    if (!value || /^none|idle|—|-$/i.test(value)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * @param {string} featureId
 * @param {string} cwd
 * @returns {string}
 */
export function featureDir(featureId, cwd) {
  if (!isValidFeatureId(featureId)) {
    throw new Error(`Invalid feature id: ${featureId} (expected NNN-slug)`);
  }
  return path.join(cwd, FEATURES_DIR, featureId);
}

/**
 * @param {string} featureId
 * @param {string} cwd
 * @param {string} filename
 * @returns {Promise<string>}
 */
export async function readFeatureArtifact(featureId, cwd, filename) {
  return readFileSafe(path.join(featureDir(featureId, cwd), filename));
}
