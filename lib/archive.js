import fs from "node:fs/promises";
import path from "node:path";

import { STATE_HEADER } from "./constants.js";
import {
  domainSpecStub,
  mergeFeatureIntoDomain,
} from "./delta-merge.js";
import { ensureDir, readFileSafe, writeFileSafe } from "./fs-utils.js";
import { runGate } from "./gates.js";
import { assertSafeDomainSlug } from "./slug-utils.js";
import {
  featureDir,
  readFeatureArtifact,
  resolveFeatureId,
} from "./specs-utils.js";

const ROADMAP_HEADER = `# Roadmap

Track milestones and archived features.

## Completed

`;

/**
 * @param {string} text
 * @returns {boolean}
 */
function validationPassed(text) {
  const visible = text.replace(/<!--[\s\S]*?-->/g, "");
  return /\b(?:PASS|PASSED)\b/.test(visible);
}

/**
 * @param {string} cwd
 * @param {string} featureId
 * @param {string} domainRelPath
 * @param {string[]} mergeSummary
 */
async function updateRoadmap(cwd, featureId, domainRelPath, mergeSummary) {
  const roadmapPath = path.join(cwd, ".specs/project/ROADMAP.md");
  await ensureDir(path.dirname(roadmapPath));

  let content;
  try {
    content = await readFileSafe(roadmapPath);
  } catch {
    content = ROADMAP_HEADER;
  }

  if (!content.includes("## Completed")) {
    content = `${content.trimEnd()}\n\n## Completed\n\n`;
  }

  const date = new Date().toISOString().slice(0, 10);
  const validationLink = `.specs/features/${featureId}/validation.md`;
  let entry = `- **${date}** \`${featureId}\` — archived. Validation: \`${validationLink}\``;

  if (domainRelPath) {
    entry += `\n  - Merged → \`${domainRelPath}\``;
    if (mergeSummary.length) {
      entry += ` (${mergeSummary.join(", ")})`;
    }
  }

  entry += "\n";

  if (content.includes(entry.trim())) {
    return { updated: false, path: roadmapPath };
  }

  const completedHeading = "## Completed";
  const idx = content.indexOf(completedHeading);
  const insertAt = idx + completedHeading.length;
  const before = content.slice(0, insertAt);
  const after = content.slice(insertAt).replace(/^\n*/, "\n\n");
  content = `${before}\n${entry}${after}`;

  await writeFileSafe(roadmapPath, content);
  return { updated: true, path: roadmapPath };
}

/**
 * @param {string} cwd
 */
async function resetState(cwd) {
  const statePath = path.join(cwd, ".specs/STATE.md");
  let content;

  try {
    content = await readFileSafe(statePath);
  } catch {
    content = STATE_HEADER;
  }

  content = content.replace(/^-\s*Feature:\s*.*$/m, "- Feature: —");
  content = content.replace(/^-\s*Phase:\s*.*$/m, "- Phase: —");
  content = content.replace(/^-\s*Branch:\s*.*$/m, "- Branch: —");
  content = content.replace(
    /^## Next Step \(single item\)\n- \[ \].*$/m,
    "## Next Step (single item)\n- [ ] —",
  );

  await writeFileSafe(statePath, content);
}

/**
 * Infer domain slug from feature id (003-chat-system → chat-system).
 *
 * @param {string} featureId
 * @returns {string}
 */
export function inferDomainFromFeature(featureId) {
  const match = /^(\d{3})-(.+)$/.exec(featureId);
  const slug = match ? match[2] : featureId;
  return assertSafeDomainSlug(slug);
}

/**
 * Archive a verified feature: ROADMAP update, optional domain merge, STATE reset.
 *
 * @param {string | undefined} featureArg
 * @param {{
 *   cwd?: string,
 *   domain?: string,
 *   skipVerify?: boolean,
 *   skipRoadmap?: boolean,
 *   skipState?: boolean,
 *   skipDomainMerge?: boolean,
 * }} [options]
 */
export async function archiveFeature(featureArg, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const featureId = await resolveFeatureId(featureArg, cwd);
  const featurePath = featureDir(featureId, cwd);

  try {
    await fs.access(featurePath);
  } catch {
    throw new Error(`Feature directory not found: ${featurePath}`);
  }

  if (!options.skipVerify) {
    const validationText = await readFeatureArtifact(featureId, cwd, "validation.md").catch(
      () => {
        throw new Error(
          `Missing validation.md for ${featureId}. Run validate-state before archive.`,
        );
      },
    );

    if (!validationPassed(validationText)) {
      throw new Error(
        `validation.md for ${featureId} does not contain PASS/PASSED. Run validate-state first.`,
      );
    }

    const traceCode = await runGate("validate-traceability", [featureId], {
      cwd,
      stdio: "pipe",
    });
    if (traceCode !== 0) {
      throw new Error(
        `validate-traceability failed for ${featureId}. Fix REQ coverage before archive.`,
      );
    }

    const gateCode = await runGate("validate-state", [featureId], {
      cwd,
      stdio: "pipe",
    });
    if (gateCode !== 0) {
      throw new Error(`validate-state failed for ${featureId}. Fix gaps before archive.`);
    }
  }

  const specText = await readFeatureArtifact(featureId, cwd, "spec.md");
  let domainRelPath = "";
  let mergeSummary = [];

  if (!options.skipDomainMerge) {
    const domain = options.domain
      ? assertSafeDomainSlug(options.domain)
      : inferDomainFromFeature(featureId);
    const domainDir = path.join(cwd, ".specs/domains", domain);
    const domainSpecPath = path.join(domainDir, "spec.md");
    domainRelPath = `.specs/domains/${domain}/spec.md`;

    await ensureDir(domainDir);

    let domainSpec;
    try {
      domainSpec = await readFileSafe(domainSpecPath);
    } catch {
      domainSpec = domainSpecStub(domain, featureId);
    }

    const merged = mergeFeatureIntoDomain(domainSpec, specText);
    mergeSummary = merged.summary;
    await writeFileSafe(domainSpecPath, merged.spec);
  }

  let roadmap = { updated: false, path: "" };
  if (!options.skipRoadmap) {
    roadmap = await updateRoadmap(cwd, featureId, domainRelPath, mergeSummary);
  }

  if (!options.skipState) {
    await resetState(cwd);
  }

  return {
    featureId,
    featureDir: path.join(".specs/features", featureId),
    domainPath: domainRelPath || null,
    mergeSummary,
    roadmapUpdated: roadmap.updated,
    roadmapPath: roadmap.path ? path.relative(cwd, roadmap.path) : null,
    stateReset: !options.skipState,
  };
}
