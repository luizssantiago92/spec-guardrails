#!/usr/bin/env node
/**
 * Runs the Python gate suite through the same interpreter lookup the CLI uses,
 * so `npm test` works where the binary is named `python` instead of `python3`.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePython } from "../lib/gates.js";

const python = await resolvePython();

if (!python) {
  console.error(
    "Python 3 not found — skipping gate tests. Install Python 3.10+ to run them.",
  );
  process.exit(1);
}

const suiteDir = path.dirname(fileURLToPath(import.meta.url));

const child = spawn(
  python.command,
  [...python.args, "-m", "unittest", "discover", "-s", suiteDir, "-p", "test_*.py"],
  { stdio: "inherit" },
);
child.on("error", (err) => {
  console.error(`Failed to run gate tests: ${err.message}`);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 1));
