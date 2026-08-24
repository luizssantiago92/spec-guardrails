#!/usr/bin/env node
/**
 * Cursor preToolUse hook — runs context-guard before file write/edit tools.
 * Installed to .cursor/hooks/ by spec-guardrails install.
 */
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const GUARDRAILS_SCRIPTS = ".specs/guardrails/scripts";
const SKIP_PREFIXES = [".specs/", ".cursor/", "node_modules/"];
const WRITE_TOOLS = new Set([
  "write",
  "strreplace",
  "search_replace",
  "editnotebook",
  "applypatch",
  "edit",
]);

/**
 * @param {unknown} input
 * @returns {Record<string, unknown> | null}
 */
function readHookInput(input) {
  if (input && typeof input === "object") {
    return /** @type {Record<string, unknown>} */ (input);
  }
  return null;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {string | null}
 */
export function extractEditPath(input) {
  const toolName = String(input.tool_name ?? input.toolName ?? "").toLowerCase();
  if (toolName && !WRITE_TOOLS.has(toolName)) {
    return null;
  }

  const rawInput = input.tool_input ?? input.toolInput ?? input.arguments ?? {};
  /** @type {Record<string, unknown>} */
  let toolInput = {};

  if (typeof rawInput === "string") {
    try {
      toolInput = JSON.parse(rawInput);
    } catch {
      return null;
    }
  } else if (rawInput && typeof rawInput === "object") {
    toolInput = /** @type {Record<string, unknown>} */ (rawInput);
  }

  const pathValue =
    toolInput.path ??
    toolInput.file_path ??
    toolInput.filePath ??
    toolInput.target_notebook ??
    toolInput.notebook_path;

  return typeof pathValue === "string" && pathValue.trim() ? pathValue.trim() : null;
}

/**
 * @param {string | null} relativePath
 * @returns {boolean}
 */
export function shouldSkipPath(relativePath) {
  if (!relativePath) {
    return true;
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return SKIP_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

/**
 * @param {{ permission: string, user_message?: string, agent_message?: string }} payload
 */
function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function allow() {
  respond({ permission: "allow" });
  process.exit(0);
}

/**
 * @param {string[]} messages
 */
function deny(messages) {
  const detail = messages.filter(Boolean).join("; ") || "context-guard blocked this edit";
  respond({
    permission: "deny",
    user_message: `Spec Guardrails blocked this edit: ${detail}`,
    agent_message:
      `Context guard blocked the edit. Align with .specs/STATE.md and task Files, or update tasks.md. ${detail}`,
  });
  process.exit(2);
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{ allowed: boolean, messages: string[] }}
 */
export function evaluateHookInput(input) {
  const editPath = extractEditPath(input);
  if (shouldSkipPath(editPath)) {
    return { allowed: true, messages: [] };
  }

  if (!existsSync(GUARDRAILS_SCRIPTS)) {
    return { allowed: true, messages: [] };
  }

  const cli = process.env.SPEC_GUARDRAILS_CLI ?? "npx @luizsantiago/spec-guardrails";
  const result = spawnSync(
    cli,
    ["context-guard", "check-edit", editPath, "--op", "write", "--json"],
    { encoding: "utf8", shell: process.platform === "win32" },
  );

  if (result.status === 0) {
    return { allowed: true, messages: [] };
  }

  /** @type {string[]} */
  let messages = ["context-guard check failed"];
  try {
    const parsed = JSON.parse(result.stdout || "{}");
    if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      messages = parsed.messages.map(String);
    }
  } catch {
    if (result.stderr?.trim()) {
      messages = [result.stderr.trim()];
    }
  }

  return { allowed: false, messages };
}

function main() {
  let parsed = null;
  try {
    parsed = readHookInput(JSON.parse(readFileSync(0, "utf8")));
  } catch {
    allow();
  }

  if (!parsed) {
    allow();
  }

  const decision = evaluateHookInput(parsed);
  if (decision.allowed) {
    allow();
  }

  deny(decision.messages);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry && import.meta.url === entry) {
  main();
}
