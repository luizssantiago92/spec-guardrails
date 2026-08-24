#!/usr/bin/env node
/**
 * Cursor beforeShellExecution hook — soft sandbox for shell commands.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * @param {Record<string, unknown>} input
 * @returns {string | null}
 */
export function extractShellCommand(input) {
  const command =
    input.command ??
    input.shellCommand ??
    input.tool_input?.command ??
    input.toolInput?.command;
  return typeof command === "string" && command.trim() ? command.trim() : null;
}

function allow() {
  process.stdout.write(`${JSON.stringify({ permission: "allow" })}\n`);
  process.exit(0);
}

/**
 * @param {string} reason
 * @param {boolean} strict
 */
function respond(reason, strict) {
  if (strict) {
    process.stdout.write(
      `${JSON.stringify({
        permission: "deny",
        user_message: `Spec Guardrails sandbox blocked this command: ${reason}`,
        agent_message: `Sandbox policy blocked the shell command. ${reason}`,
      })}\n`,
    );
    process.exit(2);
  }

  process.stdout.write(
    `${JSON.stringify({
      permission: "allow",
      agent_message: `Sandbox warning: ${reason}`,
    })}\n`,
  );
  process.exit(0);
}

function main() {
  let input = null;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    allow();
  }

  const command = extractShellCommand(input ?? {});
  if (!command) {
    allow();
  }

  const cli = process.env.SPEC_GUARDRAILS_CLI ?? "npx @luizsantiago/spec-guardrails";
  const result = spawnSync(cli, ["sandbox", "check-command", command, "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status === 0 && result.stdout) {
    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.reason && parsed.mode === "strict" && parsed.allowed === false) {
        respond(parsed.reason, true);
      }
      if (parsed.reason && parsed.mode === "warn") {
        respond(parsed.reason, false);
      }
    } catch {
      allow();
    }
  }

  if (result.status !== 0 && result.stdout) {
    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.reason) {
        respond(parsed.reason, parsed.mode === "strict");
      }
    } catch {
      allow();
    }
  }

  allow();
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry && import.meta.url === entry) {
  main();
}
