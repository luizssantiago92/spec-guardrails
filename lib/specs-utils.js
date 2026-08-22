import fs from "node:fs/promises";
import path from "node:path";

import { readFileSafe } from "./fs-utils.js";

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
      .filter((entry) => entry.isDirectory())
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
 * @param {string | undefined} raw
 * @param {string} cwd
 * @returns {Promise<string>}
 */
export async function resolveFeatureId(raw, cwd) {
  if (raw?.trim()) {
    const trimmed = raw.trim();
    const asPath = path.resolve(cwd, trimmed);

    if (trimmed.endsWith(".md") || trimmed.includes("/") || trimmed.includes("\\")) {
      const relative = path.relative(path.join(cwd, FEATURES_DIR), asPath);
      if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
        return relative.split(path.sep)[0];
      }
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
  return path.join(cwd, FEATURES_DIR, featureId);
}

/**
 * @param {string} featureId
 * @param {string} cwd
 * @param {string} filename
 * @returns {Promise<string>}
 */
export async function readFeatureArtifact(featureId, cwd, filename) {
  const filePath = path.join(featureDir(featureId, cwd), filename);
  return readFileSafe(filePath);
}
