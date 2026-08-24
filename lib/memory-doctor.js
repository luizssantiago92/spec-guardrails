import { NPX } from "./constants.js";
import { hasPython, runGuardrailsScriptCapture } from "./gates.js";

/**
 * @typedef {{
 *   database: string,
 *   exists: boolean,
 *   semantic_enabled: boolean,
 *   provider: string,
 *   entities: number,
 *   chunks: number,
 *   embeddings: number,
 *   has_artifacts: boolean,
 *   stale: boolean,
 * }} MemoryStatus
 */

/**
 * @param {string} cwd
 * @returns {Promise<MemoryStatus | null>}
 */
export async function readMemoryStatus(cwd) {
  if (!(await hasPython())) {
    return null;
  }

  try {
    const { code, stdout } = await runGuardrailsScriptCapture(
      "memory-index",
      ["status", "--json"],
      { cwd },
    );
    if (code !== 0) {
      return null;
    }
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/**
 * @param {MemoryStatus} status
 * @returns {string | null}
 */
export function memoryHintFromStatus(status) {
  if (!status.has_artifacts) {
    return null;
  }

  if (!status.exists) {
    return `${NPX("memory-index rebuild")} — project artifacts exist but the search index is missing`;
  }

  if (status.stale) {
    return `${NPX("memory-index rebuild")} — .specs/ changed since the last index rebuild`;
  }

  if (
    status.semantic_enabled &&
    status.chunks > 0 &&
    status.embeddings < Math.max(1, Math.ceil(status.chunks * 0.5))
  ) {
    return `${NPX("memory-index embed")} — semantic search is enabled but most chunks lack embeddings`;
  }

  return null;
}

/**
 * @param {string} cwd
 * @returns {Promise<string | null>}
 */
export async function resolveMemoryHint(cwd) {
  const status = await readMemoryStatus(cwd);
  if (!status) {
    return null;
  }
  return memoryHintFromStatus(status);
}
