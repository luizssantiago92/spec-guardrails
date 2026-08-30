/**
 * Human-facing messages after install — keep CLI surface minimal.
 */

const DOCS_BASE =
  "https://github.com/luizssantiago92/spec-guardrails/blob/main/docs/guide";

/** @type {Record<string, string>} */
const PLATFORM_LABELS = {
  cursor: "Cursor",
  claude: "Claude Code",
  copilot: "GitHub Copilot",
  codex: "OpenAI Codex",
};

/**
 * @param {string | null | undefined} platformId
 * @returns {string}
 */
function formatPlatformLabel(platformId) {
  if (!platformId) {
    return "Cursor (default)";
  }
  return PLATFORM_LABELS[platformId] ?? platformId;
}

/**
 * @param {{
 *   pythonAvailable?: boolean,
 *   preset?: string,
 *   detected?: string | null,
 *   skillDirs?: string[],
 *   allPlatforms?: boolean,
 * }} [options]
 * @returns {string[]}
 */
export function formatInstallNextSteps(options = {}) {
  const lines = [
    "",
    "✨ Setup complete.",
    "",
    "Next:",
  ];

  if (options.allPlatforms) {
    lines.push(
      "  1. Open your AI coding agent — skills installed for Cursor, Claude, Copilot, and Codex.",
    );
  } else if (options.skillDirs?.length === 1) {
    lines.push(
      `  1. Open ${formatPlatformLabel(options.detected)} — skills installed under ${options.skillDirs[0]}/.`,
    );
    lines.push(
      "     Need more agents? Re-run with `--all-platforms` or `--platform <cursor|claude|copilot|codex>`.",
    );
  } else {
    const trees = options.skillDirs?.join(", ") ?? ".cursor/skills";
    lines.push(
      `  1. Open your AI coding agent — skills refreshed under: ${trees}.`,
    );
    lines.push(
      "     Existing platform trees were preserved. Use `--all-platforms` to install every tree.",
    );
  }

  lines.push(
    "  2. Run **Specify** (`/specify` or “Specify a feature: …”).",
    "",
    `  Architecture: ${DOCS_BASE}/Architecture.md`,
    `  Quick start: ${DOCS_BASE}/Quick-start.md · .specs/GETTING_STARTED.md (this project)`,
  );

  if (options.preset) {
    lines.push(`  Config: .specs/config.yaml (preset: ${options.preset})`);
  }

  if (options.pythonAvailable === false) {
    lines.push(
      "  Note: install Python 3.10+ for Brakes mode (full kit with automatic gates), " +
        "or stay in Process mode (same phases, manual checkpoints).",
    );
  }

  lines.push(
    "",
    "Optional CLI (you rarely need these on day one):",
    "  project-init   existing repo with code already",
    "  doctor         Process + Brakes readiness scores",
    "  --help         full command list",
    "",
  );

  return lines;
}

/**
 * @param {{
 *   pythonAvailable?: boolean,
 *   preset?: string,
 *   detected?: string | null,
 *   skillDirs?: string[],
 *   allPlatforms?: boolean,
 * }} [options]
 */
export function printInstallNextSteps(options = {}) {
  for (const line of formatInstallNextSteps(options)) {
    console.log(line);
  }
}
