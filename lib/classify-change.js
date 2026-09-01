/**
 * Heuristic complexity classifier (no LLM) — mirrors the hub Complexity Router.
 */

const COMPLEX_SIGNALS = [
  /\bauth(entication|orization)?\b/i,
  /\bpayment|billing|checkout|stripe\b/i,
  /\bmigration|schema\b/i,
  /\binfra(structure)?|kubernetes|terraform\b/i,
  /\barchitecture|redesign\b/i,
  /\bssrf|upload|pii|secret|oauth\b/i,
  /\bapi\s+gateway|multi-tenant\b/i,
];

const MEDIUM_SIGNALS = [
  /\bfeature\b/i,
  /\bnew\s+(endpoint|page|screen|module|service)\b/i,
  /\brefactor\b/i,
  /\bintegration\b/i,
];

const DEPENDENCY_SIGNALS = [
  /\bnew\s+dependenc/i,
  /\bnpm\s+install\b/i,
  /\bpip\s+install\b/i,
  /\badd\s+package\b/i,
];

const VAGUE_SIGNALS = [
  /\bimprove\b/i,
  /\bmake\s+(?:it|this|things?)\s+better\b/i,
  /\badd\s+(?:a\s+)?(?:interface|page|screen|ui|dashboard)\b/i,
  /\b(?:somehow|something|stuff)\b/i,
  /\bwithout\s+(?:criteria|details|spec)\b/i,
];

const AI_SIGNALS = [
  /\bllm\b/i,
  /\brag\b/i,
  /\bembedding(s)?\b/i,
  /\bmcp\b/i,
  /\bagent(s)?\b/i,
  /\bprompt(s)?\b/i,
  /\bvector\b/i,
];

/**
 * @param {{ description?: string, files?: string[] }} input
 * @returns {{
 *   tier: "quick" | "simple" | "medium" | "complex",
 *   reasons: string[],
 *   next: string,
 *   suggestElicit: boolean,
 *   suggestAiSkill: boolean,
 *   fileCount: number,
 * }}
 */
export function classifyChange(input = {}) {
  const description = (input.description ?? "").trim();
  const files = (input.files ?? []).map((f) => f.trim()).filter(Boolean);
  const haystack = [description, ...files].join("\n");
  const reasons = [];
  const fileCount = files.length;

  const hasComplex = COMPLEX_SIGNALS.some((re) => re.test(haystack));
  const hasMedium = MEDIUM_SIGNALS.some((re) => re.test(haystack));
  const hasNewDep = DEPENDENCY_SIGNALS.some((re) => re.test(haystack));
  const hasVague = VAGUE_SIGNALS.some((re) => re.test(haystack));
  const hasAi = AI_SIGNALS.some((re) => re.test(haystack));

  if (hasAi) {
    reasons.push("AI engineering signal (llm/rag/mcp/agent/prompt)");
  }

  if (hasComplex) {
    reasons.push("sensitive surface or architecture signal in description/paths");
  }
  if (hasNewDep) {
    reasons.push("new dependency signal");
  }
  if (fileCount > 3) {
    reasons.push(`${fileCount} files listed (Quick max is 3)`);
  }
  if (fileCount > 0 && fileCount <= 3) {
    reasons.push(`${fileCount} file(s) listed`);
  }
  if (!description && fileCount === 0) {
    reasons.push("no description or files — defaulting to medium");
  }

  /** @type {"quick" | "simple" | "medium" | "complex"} */
  let tier = "medium";

  if (hasComplex) {
    tier = "complex";
  } else if (hasAi && (hasMedium || hasNewDep || fileCount > 3)) {
    tier = "complex";
    reasons.push("AI surface with feature-scale change — use full pipeline + AI Surface in design");
  } else if (
    !hasNewDep &&
    fileCount > 0 &&
    fileCount <= 3 &&
    description.length > 0 &&
    !hasMedium
  ) {
    tier = "quick";
    reasons.push("≤3 files, no sensitive/architecture signals");
  } else if (
    !hasNewDep &&
    (fileCount === 0 || fileCount <= 5) &&
    !hasMedium &&
    description.length > 0
  ) {
    tier = "simple";
    reasons.push("localized change without feature/architecture signals");
  } else if (hasMedium || hasNewDep || fileCount > 5) {
    tier = "medium";
    if (hasMedium) {
      reasons.push("feature / module signal");
    }
  }

  if (reasons.length === 0) {
    reasons.push("default medium tier");
  }

  const nextByTier = {
    quick: 'Use /quick (references/quick-mode.md), then validate-quick',
    simple: 'feature-init → /specify → /loop → /verify',
    medium: 'feature-init → /specify → /tasks → /loop → /verify → /archive',
    complex:
      'feature-init → full pipeline (+ /discuss, /plan; optional AppSec/QA on verify)',
  };

  if (hasVague) {
    reasons.push("vague delivery language — consider /elicit before /specify");
  }

  return {
    tier,
    reasons,
    next: nextByTier[tier],
    suggestElicit: (hasVague || hasAi) && !hasComplex,
    suggestAiSkill: hasAi,
    fileCount,
  };
}

/**
 * @param {{ tier: string, reasons: string[], next: string, fileCount: number }} result
 * @returns {string}
 */
export function formatClassifyChange(result) {
  const lines = [
    `Tier: ${result.tier}`,
    `Files considered: ${result.fileCount}`,
    "Reasons:",
    ...result.reasons.map((r) => `  - ${r}`),
    `Next: ${result.next}`,
  ];
  if (result.suggestElicit) {
    lines.push("Suggest: /elicit (structured Q&A) or /specify if scope is already clear");
  }
  if (result.suggestAiSkill) {
    lines.push("Suggest: load ai-engineering.md sister skill + document AI Surface in design.md");
  }
  return `${lines.join("\n")}\n`;
}
