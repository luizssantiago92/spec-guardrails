import fs from "node:fs/promises";
import path from "node:path";

import { installAsset, resolveInstallSource, packagedAssetPath } from "./assets.js";
import {
  GUARDRAILS_SCRIPTS_DIR,
  REFERENCE_ASSETS,
  REFERENCES_SUBDIR,
  SCRIPT_ASSETS,
  SKILL_ASSETS,
  SKILL_DIRS,
  DISPLAY_NAME,
  resolveAssetOverride,
} from "./constants.js";
import { installPlatformAdapters } from "./adapters.js";
import { ensureDir, readFileSafe, writeFileIfMissing } from "./fs-utils.js";
import { hasPython } from "./gates.js";
import { initGuardrailsMemory } from "./memory.js";
import { printInstallNextSteps } from "./next-steps.js";
import { initProjectConfig } from "./presets.js";
import { installProjectRules } from "./project-rules.js";

/**
 * @param {{ cwd?: string, repoUrl?: string, silent?: boolean }} [options]
 */
export async function install(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const log = options.silent ? () => {} : console.log;
  const override = options.repoUrl ?? resolveAssetOverride();
  const source = resolveInstallSource(options.repoUrl);
  const state = { warned: false };

  if (!options.repoUrl && override) {
    log(
      `⚠️  SPEC_GUARDRAILS_REPO_URL is set — installing skills and executable gate ` +
        `scripts from ${override} instead of the packaged assets.`,
    );
  }

  const fetchAsset = (remotePath, destPath) =>
    installAsset({ remotePath, destPath, source, state, log, boundary: cwd });

  log(`🚀 Installing ${DISPLAY_NAME}...`);

  if (source.mode === "package") {
    log("📦 Copying skills, references and gates from the npm package...");
  }

  for (const skill of SKILL_ASSETS) {
    for (const dir of SKILL_DIRS) {
      const targetDir = path.join(cwd, dir);
      await ensureDir(targetDir);
      await fetchAsset(skill.remotePath, path.join(targetDir, skill.file));
    }
  }
  log(`✅ ${SKILL_ASSETS.length} sister skills → ${SKILL_DIRS.join(", ")}`);

  log("📚 Installing phase references...");
  for (const reference of REFERENCE_ASSETS) {
    for (const dir of SKILL_DIRS) {
      const targetDir = path.join(cwd, dir, REFERENCES_SUBDIR);
      await ensureDir(targetDir);
      await fetchAsset(
        reference.remotePath,
        path.join(targetDir, reference.file),
      );
    }
  }
  log(`✅ ${REFERENCE_ASSETS.length} references → ${REFERENCES_SUBDIR}/`);

  log("🔒 Installing deterministic gates (Python)...");
  const scriptsDir = path.join(cwd, GUARDRAILS_SCRIPTS_DIR);
  await ensureDir(scriptsDir);

  for (const script of SCRIPT_ASSETS) {
    const destPath = path.join(scriptsDir, script.file);
    await fetchAsset(script.remotePath, destPath);

    try {
      await fs.chmod(destPath, 0o755);
    } catch (err) {
      log(
        `⚠️  Could not mark ${script.file} as executable (${err.code ?? err.message}). ` +
          "Run it with `python3 <script>` instead.",
      );
    }
  }
  log(`✅ ${SCRIPT_ASSETS.length} scripts → ${GUARDRAILS_SCRIPTS_DIR}`);

  log("📋 Installing project rules (.cursor/rules/)...");
  await installProjectRules(cwd, { fetchAsset });

  log("🧠 Setting up persistent memory in .specs/...");
  const { stateCreated, lessonsCreated } = await initGuardrailsMemory(cwd);

  if (options.preset) {
    const configResult = await initProjectConfig({
      cwd,
      preset: options.preset,
      force: options.forceConfig,
    });
    if (configResult.created) {
      log(`✅ config.yaml initialized from preset: ${options.preset}`);
    } else if (configResult.skipped) {
      log("ℹ️  config.yaml already exists — kept your file (use --force-config to replace)");
    }
  }

  if (stateCreated) {
    log("✅ STATE.md initialized [feed forward]");
  }

  if (lessonsCreated) {
    log("✅ LESSONS.md initialized [feedback loop]");
  }

  log("🔗 Installing platform adapters...");
  await installPlatformAdapters(cwd);
  log("✅ Adapters → .cursorrules, CLAUDE.md, copilot-instructions.md, AGENTS.md, .codex/AGENTS.md");

  const gettingStartedCreated = await writeFileIfMissing(
    path.join(cwd, ".specs/GETTING_STARTED.md"),
    await readFileSafe(packagedAssetPath("templates/GETTING_STARTED.md")),
  );
  if (gettingStartedCreated) {
    log("✅ GETTING_STARTED.md → .specs/");
  }

  const pythonAvailable = await hasPython();
  if (!pythonAvailable) {
    log(
      "⚠️  Python 3 not found — Process mode only (flexible workflow, manual checkpoints). " +
        "Install Python 3.10+ for Brakes mode (full kit with automatic gates).",
    );
  }

  if (!options.silent) {
    printInstallNextSteps({ pythonAvailable, preset: options.preset });
  }

  return { pythonAvailable };
}
