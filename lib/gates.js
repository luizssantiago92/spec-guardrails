import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import { NPX, GUARDRAILS_SCRIPTS_DIR } from "./constants.js";

/** @typedef {{ command: string, args: string[] }} PythonInterpreter */

const PYTHON_CANDIDATES_UNIX = [
  { command: "python3", args: [] },
  { command: "python", args: [] },
  { command: "py", args: ["-3"] },
];

const PYTHON_CANDIDATES_WINDOWS = [
  { command: "py", args: ["-3"] },
  { command: "python", args: [] },
  { command: "python3", args: [] },
];

/**
 * @returns {PythonInterpreter[]}
 */
export function getPythonCandidates() {
  return process.platform === "win32" ? PYTHON_CANDIDATES_WINDOWS : PYTHON_CANDIDATES_UNIX;
}

const MIN_PYTHON = [3, 10];

const GATE_SCRIPTS = {
  "validate-spec": "validate_spec.py",
  "validate-tasks": "validate_tasks.py",
  "validate-state": "validate_state.py",
  "validate-traceability": "validate_traceability.py",
  "validate-quick": "validate_quick.py",
  "analyze-artifacts": "analyze_artifacts.py",
  "check-commit": "check_commit.py",
  lessons: "lessons.py",
};

const AUX_SCRIPTS = {
  "loop-plan": "loop_plan.py",
  "memory-index": "memory_index.py",
  "memory-query": "memory_query.py",
};

const GUARDRAILS_SCRIPTS = { ...GATE_SCRIPTS, ...AUX_SCRIPTS };

export const GATE_COMMANDS = Object.keys(GATE_SCRIPTS);

export const AUX_COMMANDS = Object.keys(AUX_SCRIPTS);

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<number>}
 */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? "inherit",
      ...(options.cwd ? { cwd: options.cwd } : {}),
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/**
 * @param {string} output
 * @returns {[number, number] | null}
 */
export function parsePythonVersion(output) {
  const match = output.match(/^Python\s+(\d+)\.(\d+)/im);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

/**
 * @param {[number, number] | null} version
 * @param {[number, number]} minimum
 * @returns {boolean}
 */
export function satisfiesMinPython(version, minimum = MIN_PYTHON) {
  if (!version) {
    return false;
  }
  if (version[0] !== minimum[0]) {
    return version[0] > minimum[0];
  }
  return version[1] >= minimum[1];
}

/**
 * @param {PythonInterpreter} interpreter
 * @returns {Promise<string>}
 */
async function readPythonVersion(interpreter) {
  let output = "";
  await new Promise((resolve, reject) => {
    const child = spawn(interpreter.command, [...interpreter.args, "--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${interpreter.command} --version exited ${code}`));
      }
    });
  });
  return output;
}

/**
 * Resolve gate scripts directory (`.specs/guardrails/scripts` only — no legacy dual-path).
 *
 * @param {string} _cwd
 * @returns {Promise<string>}
 */
export async function resolveScriptsDir(_cwd) {
  return GUARDRAILS_SCRIPTS_DIR;
}

/**
 * Resolve a Python 3.10+ interpreter, or null when none qualifies.
 *
 * @returns {Promise<PythonInterpreter | null>}
 */
export async function resolvePython() {
  for (const candidate of getPythonCandidates()) {
    try {
      const output = await readPythonVersion(candidate);
      const version = parsePythonVersion(output);
      if (satisfiesMinPython(version, MIN_PYTHON)) {
        return candidate;
      }
    } catch {
      // Interpreter not on PATH or below minimum; try the next candidate.
    }
  }

  return null;
}

/** @returns {Promise<boolean>} */
export async function hasPython() {
  return (await resolvePython()) !== null;
}

/**
 * Run a guardrails Python script installed under `.specs/guardrails/scripts/`.
 *
 * @param {string} command gate or aux command name
 * @param {string[]} args forwarded to the Python script
 * @param {{ cwd?: string, stdio?: import("node:child_process").StdioOptions }} [options]
 * @returns {Promise<number>} process exit code
 */
export async function runGuardrailsScript(command, args, options = {}) {
  const scriptName = GUARDRAILS_SCRIPTS[command];

  if (!scriptName) {
    throw new Error(`Unknown guardrails command: ${command}`);
  }

  const cwd = options.cwd ?? process.cwd();
  const scriptsDir = await resolveScriptsDir(cwd);
  const scriptPath = path.join(cwd, scriptsDir, scriptName);

  for (const required of [scriptName, "_common.py"]) {
    try {
      await access(path.join(cwd, scriptsDir, required), constants.R_OK);
    } catch {
      throw new Error(
        `Guardrails script not found at ${path.join(scriptsDir, required)}. ` +
          `Run \`${NPX("install")}\` in this project first.`,
      );
    }
  }

  const python = await resolvePython();

  if (!python) {
    throw new Error(
      "Python 3.10+ not found. Install Python 3.10+ for Brakes mode (automatic gates), " +
        "or perform the equivalent checks manually in Process mode.",
    );
  }

  return run(python.command, [...python.args, scriptPath, ...args], {
    cwd,
    stdio: options.stdio,
  });
}

/**
 * Run a structural gate script installed under `.specs/guardrails/scripts/`.
 *
 * @param {string} gate one of GATE_COMMANDS
 * @param {string[]} args forwarded to the Python script
 * @param {{ cwd?: string, stdio?: import("node:child_process").StdioOptions }} [options]
 * @returns {Promise<number>} process exit code
 */
export async function runGate(gate, args, options = {}) {
  if (!GATE_SCRIPTS[gate]) {
    throw new Error(`Unknown gate: ${gate}`);
  }

  return runGuardrailsScript(gate, args, options);
}
