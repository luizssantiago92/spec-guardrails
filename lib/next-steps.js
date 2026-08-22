/**
 * Human-facing messages after install — keep CLI surface minimal.
 */

/**
 * @param {{ pythonAvailable?: boolean, preset?: string }} [options]
 * @returns {string[]}
 */
export function formatInstallNextSteps(options = {}) {
  const lines = [
    "",
    "✨ Setup complete.",
    "",
    "Next:",
    "  1. Open your AI coding agent in this project (Cursor and Claude Code adapters install automatically).",
    "  2. Run **Specify** (`/specify` or “Specify a feature: …”).",
    "",
    "  Other agents: core + CLI work anywhere — see docs/guide/Architecture.md",
    "  Guide: docs/guide/Quick-start.md (repo) · .specs/GETTING_STARTED.md (this project)",
  ];

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
    "  doctor         if something looks wrong",
    "  --help         full command list",
    "",
  );

  return lines;
}

/**
 * @param {{ pythonAvailable?: boolean, preset?: string }} [options]
 */
export function printInstallNextSteps(options = {}) {
  for (const line of formatInstallNextSteps(options)) {
    console.log(line);
  }
}
