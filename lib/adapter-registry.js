import { injectAgentsMd } from "./agents-md.js";
import { injectCodexAgents } from "./codex-agents.js";
import { injectCopilotInstructions } from "./copilot-instructions.js";
import { injectClaudeMd } from "./claude-md.js";
import { injectCursorRules } from "./cursorrules.js";

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   skillsDir: string | null,
 *   entryFiles: string[],
 *   capabilities: {
 *     supports_commands: boolean,
 *     supports_rules: boolean,
 *     supports_skills: boolean,
 *   },
 *   install: (cwd: string) => Promise<void>,
 * }} PlatformAdapter
 */

/** @type {PlatformAdapter[]} */
export const ADAPTER_REGISTRY = [
  {
    id: "cursor",
    label: "Cursor",
    skillsDir: ".cursor/skills",
    entryFiles: [".cursorrules", ".cursor/rules/engineering-baseline.mdc"],
    capabilities: {
      supports_commands: true,
      supports_rules: true,
      supports_skills: true,
    },
    install: injectCursorRules,
  },
  {
    id: "claude",
    label: "Claude Code",
    skillsDir: ".claude/skills",
    entryFiles: [".claude/CLAUDE.md"],
    capabilities: {
      supports_commands: true,
      supports_rules: false,
      supports_skills: true,
    },
    install: injectClaudeMd,
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    skillsDir: ".github/skills",
    entryFiles: [".github/copilot-instructions.md"],
    capabilities: {
      supports_commands: false,
      supports_rules: false,
      supports_skills: true,
    },
    install: injectCopilotInstructions,
  },
  {
    id: "codex",
    label: "OpenAI Codex",
    skillsDir: ".codex/skills",
    entryFiles: [".codex/AGENTS.md"],
    capabilities: {
      supports_commands: false,
      supports_rules: false,
      supports_skills: true,
    },
    install: injectCodexAgents,
  },
  {
    id: "agents-md",
    label: "AGENTS.md (open standard)",
    skillsDir: null,
    entryFiles: ["AGENTS.md"],
    capabilities: {
      supports_commands: false,
      supports_rules: false,
      supports_skills: false,
    },
    install: injectAgentsMd,
  },
];

/**
 * @param {string} id
 * @returns {PlatformAdapter | undefined}
 */
export function getAdapter(id) {
  return ADAPTER_REGISTRY.find((adapter) => adapter.id === id);
}

/** @returns {PlatformAdapter[]} */
export function listAdapters() {
  return [...ADAPTER_REGISTRY];
}

/**
 * @param {keyof PlatformAdapter["capabilities"]} capability
 * @returns {PlatformAdapter[]}
 */
export function getAdaptersWithCapability(capability) {
  return ADAPTER_REGISTRY.filter((adapter) => adapter.capabilities[capability]);
}

/**
 * @param {string} cwd
 * @param {PlatformAdapter} [adapter]
 */
export async function installAdapter(cwd, adapter) {
  await adapter.install(cwd);
}

/**
 * Install all registered platform adapters.
 *
 * @param {string} cwd
 */
export async function installAllAdapters(cwd) {
  await installAdapters(
    cwd,
    ADAPTER_REGISTRY.map((adapter) => adapter.id),
  );
}

/**
 * Install selected platform adapters by id.
 *
 * @param {string} cwd
 * @param {string[]} adapterIds
 */
export async function installAdapters(cwd, adapterIds) {
  const wanted = new Set(adapterIds);
  await Promise.all(
    ADAPTER_REGISTRY.filter((adapter) => wanted.has(adapter.id)).map((adapter) =>
      installAdapter(cwd, adapter),
    ),
  );
}
