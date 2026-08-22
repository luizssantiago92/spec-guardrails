import {
  CURSORRULES_MARKER_BEGIN,
  CURSORRULES_MARKER_END,
} from "./constants.js";

/**
 * Build a Spec Guardrails execution contract block for a platform adapter.
 *
 * @param {{ skillPrefix: string, footerLines?: string[] }} options
 * @returns {string}
 */
export function buildExecutionContractBlock({ skillPrefix, footerLines = [] }) {
  const footer =
    footerLines.length > 0 ? `\n${footerLines.join("\n")}\n` : "\n";

  return `${CURSORRULES_MARKER_BEGIN}
# Execution Contract (Spec Guardrails)

When planning architecture, specs, or multi-step features, read the hub first:

- \`${skillPrefix}/agent-architecture.md\` — SDD hub: contract, phases, gates, complexity router
- \`${skillPrefix}/references/\` — phase procedures (explore, project-init, constitution, specify, discuss, design, tasks, analyze, implement, validate, converge, archive, memory, quick-mode, context-limits, lessons, sub-agents)
- \`${skillPrefix}/task-graph-engineering.md\` — task DAG, parallelism, verify topology
- \`${skillPrefix}/engineering-standards.md\` — secure coding, code quality, artifact language
- \`${skillPrefix}/security-review.md\` — security checklist for /verify
- Sister skills (\`appsec\`, \`qa-strategy\`, \`code-simplify\`, \`ship-ready\`, \`git-handoff\`) — load **one conditional** at a time

Deterministic gates (\`python3\`, non-zero exit means STOP):

- Scripts in \`.specs/guardrails/scripts/\` — the **agent** runs them at phase boundaries (see hub).
- Humans: \`install\` once; optional \`feature-init\`, \`project-init\`, \`doctor\`, \`classify-change\`, \`feature-status\`.
- Full CLI: \`npx @luizsantiago/spec-guardrails --help\`
- Onboarding: \`.specs/GETTING_STARTED.md\`

All project artifacts are written in English.
Persistent state: \`.specs/STATE.md\`, \`.specs/lessons.json\`, \`.specs/LESSONS.md\`.${footer}${CURSORRULES_MARKER_END}
`;
}

/** @returns {string} Core contract body without adapter-specific footers (for parity tests). */
export function extractContractCore(block) {
  const begin = block.indexOf(CURSORRULES_MARKER_BEGIN);
  const end = block.indexOf(CURSORRULES_MARKER_END);
  if (begin === -1 || end === -1 || end < begin) {
    return block.trim();
  }
  let core = block.slice(begin + CURSORRULES_MARKER_BEGIN.length, end).trim();
  const footerMarkers = [
    "Project rules:",
    "Cursor users also get",
    "GitHub Copilot reads",
    "OpenAI Codex adapter",
    "Agent-agnostic entry",
  ];
  for (const marker of footerMarkers) {
    const idx = core.indexOf(marker);
    if (idx !== -1) {
      core = core.slice(0, idx).trimEnd();
    }
  }
  return core;
}

export const CURSORRULES_BLOCK = buildExecutionContractBlock({
  skillPrefix: ".cursor/skills",
  footerLines: ["Project rules: `.cursor/rules/engineering-baseline.mdc`"],
});

export const CLAUDE_MD_BLOCK = buildExecutionContractBlock({
  skillPrefix: ".claude/skills",
  footerLines: [
    "Cursor users also get `.cursorrules` + `.cursor/rules/engineering-baseline.mdc` — same contract, different entrypoint. See Platform-parity docs in the package repo.",
  ],
});
