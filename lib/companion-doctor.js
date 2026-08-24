import path from "node:path";

import { GUARDRAILS_SCRIPTS_DIR } from "./constants.js";
import {
  listInstalledCompanions,
  readCompanionsIndex,
} from "./companions.js";
import { readFileSafe } from "./fs-utils.js";

/**
 * @typedef {import("./doctor.js").DoctorCheck} DoctorCheck
 */

/**
 * @param {string} cwd
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
async function pathExists(cwd, relativePath) {
  try {
    const { access } = await import("node:fs/promises");
    await access(path.join(cwd, relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Filesystem probes for installed Atlas companions (no Atlas CLI spawn).
 * Used by Guardrails doctor when `.specs/companions/INDEX.json` exists.
 *
 * @param {string} cwd
 * @returns {Promise<{
 *   paired: boolean,
 *   companions: import("./companions.js").CompanionIndexEntry[],
 *   checks: DoctorCheck[],
 * }>}
 */
export async function runCompanionDoctorChecks(cwd) {
  const index = await readCompanionsIndex(cwd);
  const companions = await listInstalledCompanions(cwd);
  /** @type {DoctorCheck[]} */
  const checks = [];

  if (companions.length === 0) {
    return { paired: false, companions: [], checks };
  }

  const paired = Boolean(index?.paired);
  let projectContent = "";
  try {
    projectContent = await readFileSafe(path.join(cwd, ".specs/project/PROJECT.md"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  checks.push({
    id: "atlas-companions",
    label: "Atlas companions registry (.specs/companions/INDEX.json)",
    weight: 5,
    pass: true,
    optional: !paired,
  });

  for (const companion of companions) {
    const prefix = `atlas-${companion.id}`;
    const installHint = `npx ${companion.npm} install`;
    const optional = !paired;

    const primaryGate = companion.gates[0] ?? "";
    const gateOk = primaryGate
      ? await pathExists(cwd, path.join(companion.scriptsDir, primaryGate))
      : false;
    checks.push({
      id: `${prefix}-gate`,
      label: `${companion.displayName}: routing gate (${companion.scriptsDir})`,
      weight: 4,
      pass: gateOk,
      optional,
      suggest: gateOk ? undefined : installHint,
    });

    const ruleOk = await pathExists(cwd, companion.ruleFile);
    checks.push({
      id: `${prefix}-rule`,
      label: `${companion.displayName}: Cursor rule (${companion.ruleFile})`,
      weight: 2,
      pass: ruleOk,
      optional,
      suggest: ruleOk ? undefined : installHint,
    });

    const registryOk = projectContent
      ? projectContent.includes(companion.projectSection)
      : false;
    checks.push({
      id: `${prefix}-registry`,
      label: `${companion.displayName}: PROJECT.md registry section`,
      weight: 2,
      pass: registryOk,
      optional: true,
      suggest: registryOk
        ? undefined
        : `${installHint} --sync-registry`,
    });

    if (paired) {
      const mirrorName =
        companion.gates.find((name) => name !== primaryGate) ?? "";
      if (mirrorName) {
        const mirrorOk = await pathExists(
          cwd,
          path.join(GUARDRAILS_SCRIPTS_DIR, mirrorName),
        );
        checks.push({
          id: `${prefix}-mirror`,
          label: `${companion.displayName}: gate mirror (${GUARDRAILS_SCRIPTS_DIR}/${mirrorName})`,
          weight: 3,
          pass: mirrorOk,
          optional,
          suggest: mirrorOk ? undefined : installHint,
        });
      }
    }
  }

  return { paired, companions, checks };
}

/**
 * @param {DoctorCheck[]} companionChecks
 * @returns {{ ready: boolean, passed: number, total: number }}
 */
export function summarizeCompanionChecks(companionChecks) {
  const scoped = companionChecks.filter((check) => check.id !== "atlas-companions");
  const required = scoped.filter((check) => !check.optional);
  const passed = scoped.filter((check) => check.pass).length;
  const requiredPassed = required.filter((check) => check.pass).length;
  return {
    ready: required.length === 0 || requiredPassed === required.length,
    passed,
    total: scoped.length,
  };
}
