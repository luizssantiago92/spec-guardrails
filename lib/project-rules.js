import fs from "node:fs/promises";
import path from "node:path";

import { CURSOR_RULES_DIR, RULE_ASSETS } from "./constants.js";
import { assertSafeWriteTarget, ensureDir } from "./fs-utils.js";

/** Markers around the catalog skills table — refreshed on every install. */
export const SKILLS_MAP_START = "<!-- guardrails-managed:skills-map:start -->";
export const SKILLS_MAP_END = "<!-- guardrails-managed:skills-map:end -->";

/** Markers around the gates table — refreshed on every install. */
export const GATES_MAP_START = "<!-- guardrails-managed:gates-map:start -->";
export const GATES_MAP_END = "<!-- guardrails-managed:gates-map:end -->";

/** Prior managed markers — recognized only so `install` can refresh tables. */
const LEGACY_SKILLS_MAP_PAIRS = [
  ["<!-- seatbelt-managed:skills-map:start -->", "<!-- seatbelt-managed:skills-map:end -->"],
  ["<!-- harness-managed:skills-map:start -->", "<!-- harness-managed:skills-map:end -->"],
];
const LEGACY_GATES_MAP_PAIRS = [
  ["<!-- seatbelt-managed:gates-map:start -->", "<!-- seatbelt-managed:gates-map:end -->"],
  ["<!-- harness-managed:gates-map:start -->", "<!-- harness-managed:gates-map:end -->"],
];

/**
 * @param {string} content
 * @param {string} startMarker
 * @param {string} endMarker
 * @returns {string | null}
 */
export function extractManagedBlock(content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < 0 || end < start) {
    return null;
  }
  return content.slice(start, end + endMarker.length);
}

/**
 * @param {string} content
 * @param {[string, string][]} markerPairs
 * @returns {string | null}
 */
function extractFirstManagedBlock(content, markerPairs) {
  for (const [startMarker, endMarker] of markerPairs) {
    const block = extractManagedBlock(content, startMarker, endMarker);
    if (block) {
      return block;
    }
  }
  return null;
}

/**
 * @param {string} content
 * @returns {string | null}
 */
export function extractSkillsMapBlock(content) {
  return extractFirstManagedBlock(content, [
    [SKILLS_MAP_START, SKILLS_MAP_END],
    ...LEGACY_SKILLS_MAP_PAIRS,
  ]);
}

/**
 * @param {string} content
 * @returns {string | null}
 */
export function extractGatesMapBlock(content) {
  return extractFirstManagedBlock(content, [
    [GATES_MAP_START, GATES_MAP_END],
    ...LEGACY_GATES_MAP_PAIRS,
  ]);
}

/**
 * Replace a managed block when present in `existing`, otherwise append it.
 *
 * @param {string} existing
 * @param {string} shippedBlock
 * @param {string} startMarker
 * @param {string} endMarker
 * @param {[string, string][]} legacyMarkerPairs
 * @param {string} [appendHeading]
 * @returns {string}
 */
function mergeManagedBlock(
  existing,
  shippedBlock,
  startMarker,
  endMarker,
  legacyMarkerPairs,
  appendHeading = "",
) {
  for (const [legacyStart, legacyEnd] of legacyMarkerPairs) {
    const legacyBlock = extractManagedBlock(existing, legacyStart, legacyEnd);
    if (legacyBlock) {
      return existing.replace(legacyBlock, shippedBlock);
    }
  }

  const existingBlock = extractManagedBlock(existing, startMarker, endMarker);
  if (existingBlock) {
    return existing.replace(existingBlock, shippedBlock);
  }

  if (appendHeading) {
    return `${existing.trimEnd()}\n\n${appendHeading}\n\n${shippedBlock}\n`;
  }

  return `${existing.trimEnd()}\n\n${shippedBlock}\n`;
}

/**
 * Merge shipped baseline into an existing rule file without wiping user prose.
 *
 * @param {string} existing
 * @param {string} shipped
 * @returns {string}
 */
export function mergeBaselineRule(existing, shipped) {
  const shippedSkills = extractSkillsMapBlock(shipped);
  const shippedGates = extractGatesMapBlock(shipped);
  if (!shippedSkills && !shippedGates) {
    return shipped;
  }

  let merged = existing;

  if (shippedSkills) {
    const skillsSection = /^# (?:Harness|Seatbelt|Guardrails) Skills\b[\s\S]*?(?=^# |\Z)/m;
    if (
      !extractSkillsMapBlock(merged) &&
      skillsSection.test(merged) &&
      shipped.match(/^# (?:Harness|Seatbelt|Guardrails) Skills\b[\s\S]*?(?=^# |\Z)/m)
    ) {
      const shippedSection = shipped.match(/^# (?:Harness|Seatbelt|Guardrails) Skills\b[\s\S]*?(?=^# |\Z)/m);
      if (shippedSection) {
        merged = merged.replace(skillsSection, shippedSection[0]);
      }
    } else {
      merged = mergeManagedBlock(
        merged,
        shippedSkills,
        SKILLS_MAP_START,
        SKILLS_MAP_END,
        LEGACY_SKILLS_MAP_PAIRS,
        extractSkillsMapBlock(merged) ? "" : "# Guardrails Skills",
      );
    }
  }

  if (shippedGates) {
    merged = mergeManagedBlock(
      merged,
      shippedGates,
      GATES_MAP_START,
      GATES_MAP_END,
      LEGACY_GATES_MAP_PAIRS,
      extractGatesMapBlock(merged) ? "" : "# Deterministic Gates",
    );
  }

  return merged;
}

/**
 * Install Cursor project rules (.cursor/rules/*.mdc).
 *
 * @param {string} cwd
 * @param {{ fetchAsset: (remotePath: string, destPath: string) => Promise<void> }} options
 */
export async function installProjectRules(cwd, options) {
  const rulesDir = path.join(cwd, CURSOR_RULES_DIR);
  await ensureDir(rulesDir);

  for (const rule of RULE_ASSETS) {
    const destPath = path.join(rulesDir, rule.file);
    const tmpPath = path.join(rulesDir, `.${rule.file}.incoming`);

    try {
      await options.fetchAsset(rule.remotePath, tmpPath);
      const shipped = await fs.readFile(tmpPath, "utf8");

      let exists = false;
      try {
        await fs.access(destPath);
        exists = true;
      } catch (err) {
        if (err.code !== "ENOENT") {
          throw err;
        }
      }

      if (!exists) {
        await assertSafeWriteTarget(destPath);
        await fs.rename(tmpPath, destPath);
        continue;
      }

      const existing = await fs.readFile(destPath, "utf8");
      const merged = mergeBaselineRule(existing, shipped);
      await assertSafeWriteTarget(destPath);
      await fs.writeFile(destPath, merged, "utf8");
      await fs.rm(tmpPath, { force: true });
    } catch (err) {
      await fs.rm(tmpPath, { force: true }).catch(() => {});
      throw err;
    }
  }
}
