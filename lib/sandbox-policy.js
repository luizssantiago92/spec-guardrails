import path from "node:path";

import { readFileSafe } from "./fs-utils.js";

export const SANDBOX_LOG_PATH = ".specs/state/sandbox-log.json";

/** @type {readonly { id: string, pattern: RegExp, reason: string }[]} */
export const DEFAULT_SANDBOX_DENIES = [
  {
    id: "rm-rf",
    pattern: /\brm\s+(-[^\s]*f[^\s]*\s+-[^\s]*r|-[^\s]*r[^\s]*\s+-[^\s]*f|-rf|-fr)\s/i,
    reason: "recursive force delete is blocked by sandbox policy",
  },
  {
    id: "curl-pipe-sh",
    pattern: /\bcurl\b[^\n|]*\|\s*(?:ba)?sh\b/i,
    reason: "curl piped to shell is blocked by sandbox policy",
  },
  {
    id: "wget-pipe-sh",
    pattern: /\bwget\b[^\n|]*\|\s*(?:ba)?sh\b/i,
    reason: "wget piped to shell is blocked by sandbox policy",
  },
  {
    id: "force-push-main",
    pattern: /\bgit\s+push\b[^\n]*(--force|--force-with-lease)[^\n]*\b(main|master)\b/i,
    reason: "force push to main/master is blocked by sandbox policy",
  },
  {
    id: "drop-database",
    pattern: /\b(DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+TABLE)\b/i,
    reason: "destructive SQL is blocked by sandbox policy",
  },
];

/**
 * @typedef {"off" | "warn" | "strict"} SandboxMode
 */

/**
 * @typedef {{
 *   mode: SandboxMode,
 *   deny_patterns: { id: string, pattern: RegExp, reason: string }[],
 * }} SandboxPolicy
 */

/**
 * @param {string} text
 * @returns {SandboxPolicy}
 */
export function parseSandboxPolicy(text) {
  /** @type {SandboxPolicy} */
  const policy = {
    mode: "warn",
    deny_patterns: [...DEFAULT_SANDBOX_DENIES],
  };

  let inSandbox = false;
  let sandboxIndent = 0;
  let inDenyList = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = line.length - line.trimStart().length;

    if (trimmed === "sandbox:") {
      inSandbox = true;
      inDenyList = false;
      sandboxIndent = indent;
      continue;
    }

    if (inSandbox && indent <= sandboxIndent && trimmed !== "sandbox:") {
      inSandbox = false;
      inDenyList = false;
    }

    if (!inSandbox) {
      continue;
    }

    const modeMatch = trimmed.match(/^mode:\s*(off|warn|strict)\s*$/i);
    if (modeMatch) {
      policy.mode = /** @type {SandboxMode} */ (modeMatch[1].toLowerCase());
      continue;
    }

    if (trimmed === "deny_patterns:") {
      inDenyList = true;
      continue;
    }

    if (inDenyList && trimmed.startsWith("- ")) {
      const raw = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, "");
      if (raw) {
        try {
          policy.deny_patterns.push({
            id: `custom-${policy.deny_patterns.length + 1}`,
            pattern: new RegExp(raw, "i"),
            reason: `matched custom sandbox deny pattern: ${raw}`,
          });
        } catch {
          // ignore invalid regex in config
        }
      }
    }
  }

  return policy;
}

/**
 * @param {string} cwd
 * @returns {Promise<SandboxPolicy>}
 */
export async function loadSandboxPolicy(cwd) {
  try {
    const text = await readFileSafe(path.join(cwd, ".specs/config.yaml"));
    return parseSandboxPolicy(text);
  } catch {
    return { mode: "warn", deny_patterns: [...DEFAULT_SANDBOX_DENIES] };
  }
}

/**
 * @param {string} command
 * @param {SandboxPolicy} policy
 * @returns {{ allowed: boolean, severity: "info" | "warning" | "blocking", reason: string | null, mode: SandboxMode }}
 */
export function checkSandboxCommand(command, policy) {
  const mode = policy.mode ?? "warn";
  if (mode === "off") {
    return { allowed: true, severity: "info", reason: null, mode };
  }

  const normalized = String(command || "").trim();
  if (!normalized) {
    return { allowed: true, severity: "info", reason: null, mode };
  }

  for (const rule of policy.deny_patterns) {
    if (rule.pattern.test(normalized)) {
      if (mode === "strict") {
        return { allowed: false, severity: "blocking", reason: rule.reason, mode };
      }
      return { allowed: true, severity: "warning", reason: rule.reason, mode };
    }
  }

  return { allowed: true, severity: "info", reason: null, mode };
}

/**
 * @param {Awaited<ReturnType<typeof checkSandboxCommand>>} result
 * @param {string} command
 * @param {{ json?: boolean }} [options]
 */
export function formatSandboxCheck(result, command, options = {}) {
  if (options.json) {
    return JSON.stringify({ command, ...result }, null, 2);
  }

  if (!result.reason) {
    return `Sandbox [${result.mode}]: allowed\n`;
  }

  const label = result.allowed ? "warn" : "blocked";
  return `Sandbox [${result.mode}]: ${label}\n  ${result.reason}\n`;
}
