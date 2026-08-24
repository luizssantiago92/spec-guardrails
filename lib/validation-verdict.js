const SECTION_START = /^#{2,6}\s/m;

const VERDICT_INLINE =
  /^\s*[-*]?\s*\*{0,2}(?:verdict|result|status)\*{0,2}\s*:\s*\*{0,2}([A-Za-z ]+)/im;

const VERDICT_HEADING =
  /^#{1,6}\s*(?:verdict|result|status)\s*$\s*\n+\s*\*{0,2}([A-Za-z ]+)/im;

const PASS_VERDICTS = new Set(["PASS", "PASSED"]);

/**
 * @param {string} text
 * @returns {string}
 */
function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (match) =>
    "\n".repeat((match.match(/\n/g) ?? []).length),
  );
}

/**
 * Blank fenced code so structural regexes ignore sample snippets.
 *
 * @param {string} text
 * @returns {string}
 */
function maskFencedBlocks(text) {
  const lines = text.split("\n");
  const masked = [];
  let inFence = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      masked.push("");
      continue;
    }
    masked.push(inFence ? "" : line);
  }

  return masked.join("\n");
}

/**
 * @param {string} text
 * @returns {string}
 */
export function visibleMarkdown(text) {
  return maskFencedBlocks(stripHtmlComments(text));
}

/**
 * @param {string} text
 * @returns {string}
 */
function validationPreamble(text) {
  const visible = visibleMarkdown(text);
  const match = SECTION_START.exec(visible);
  if (!match) {
    return visible;
  }
  return visible.slice(0, match.index);
}

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeVerdict(raw) {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Match validate_state.py: verdict only in preamble or under a ## Verdict heading.
 *
 * @param {string} text
 * @returns {string | null}
 */
export function findVerdict(text) {
  const preamble = validationPreamble(text);
  const inlineMatch = preamble.match(VERDICT_INLINE);
  if (inlineMatch) {
    return normalizeVerdict(inlineMatch[1]);
  }

  const headingMatch = visibleMarkdown(text).match(VERDICT_HEADING);
  if (headingMatch) {
    return normalizeVerdict(headingMatch[1]);
  }

  return null;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isPassVerdict(text) {
  const verdict = findVerdict(text);
  return verdict !== null && PASS_VERDICTS.has(verdict);
}
