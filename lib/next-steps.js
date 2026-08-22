/**
 * Human-facing messages after install — keep CLI surface minimal.
 */

const DOCS_BASE =
  "https://github.com/luizssantiago92/spec-guardrails/blob/main/docs/guide";

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
    "  1. Open your AI coding agent in this project (Cursor, Claude, Copilot, Codex, or AGENTS.md adapters install automatically).",
    "  2. Run **Specify** (`/specify` or “Specify a feature: …”).",
    "",
    `  Architecture: ${DOCS_BASE}/Architecture.md`,
    `  Quick start: ${DOCS_BASE}/Quick-start.md · .specs/GETTING_STARTED.md (this project)`,
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
    "  doctor         Process + Brakes readiness scores",
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
