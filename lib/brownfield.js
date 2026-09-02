import fs from "node:fs/promises";
import path from "node:path";

import { domainSpecStub } from "./delta-merge.js";
import { ensureDir, readFileSafe, writeFileIfMissing, writeFileSafe } from "./fs-utils.js";
import { runGuardrailsScriptCapture } from "./gates.js";
import { initGuardrailsMemory } from "./memory.js";
import { initProjectConfig } from "./presets.js";
import { assertSafeDomainSlug, slugifyDomain } from "./slug-utils.js";

const SKIP_DIRS = new Set([
  ".git",
  ".specs",
  ".cursor",
  ".claude",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
  "__pycache__",
  ".next",
  ".turbo",
  "tmp",
  "temp",
]);

const SKIP_DOMAIN_NAMES = new Set([
  "common",
  "config",
  "core",
  "docs",
  "lib",
  "public",
  "scripts",
  "shared",
  "static",
  "test",
  "tests",
  "types",
  "utils",
]);

const ROADMAP_HEADER = `# Roadmap

Track milestones and archived features.

## Planned

## Completed

`;

/**
 * @param {string} cwd
 * @returns {Promise<string>}
 */
async function readRepoName(cwd) {
  try {
    const pkg = JSON.parse(await readFileSafe(path.join(cwd, "package.json")));
    if (typeof pkg.name === "string" && pkg.name.trim()) {
      return pkg.name.replace(/^@.*\//, "").trim();
    }
  } catch {
    // not a Node project
  }

  return path.basename(cwd);
}

/**
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
async function dirHasFilesMatching(dir, pattern) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && pattern.test(entry.name)) {
        return true;
      }
    }
  } catch {
    // missing dir
  }
  return false;
}

/**
 * @param {string} cwd
 * @returns {Promise<{ stack: string, testCommand: string, lintCommand?: string, preset?: string, roots: string[], hasCompose?: boolean, hasTerraform?: boolean, hasHelm?: boolean, hasCi?: boolean, hasAiStack?: boolean, hasEvalHarness?: boolean }>}
 */
export async function detectProjectStack(cwd) {
  /** @type {{ stack: string, testCommand: string, lintCommand?: string, preset?: string, roots: string[], hasCompose?: boolean, hasTerraform?: boolean, hasHelm?: boolean, hasCi?: boolean, hasAiStack?: boolean, hasEvalHarness?: boolean }} */
  const result = {
    stack: "unknown",
    testCommand: "(fill in)",
    roots: [],
  };

  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(await readFileSafe(pkgPath));
    const scripts = pkg.scripts ?? {};
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    result.stack = deps.typescript ? "Node.js + TypeScript" : "Node.js";
    result.preset = deps.typescript ? "node-ts" : "default";
    result.testCommand = scripts.test ? "npm test" : result.testCommand;
    if (scripts.lint) {
      result.lintCommand = "npm run lint";
    }
  } catch {
    // fall through
  }

  if (result.stack === "unknown") {
    try {
      await fs.access(path.join(cwd, "pyproject.toml"));
      result.stack = "Python";
      result.preset = "python";
      result.testCommand = "pytest";
      result.lintCommand = "ruff check .";
    } catch {
      try {
        await fs.access(path.join(cwd, "requirements.txt"));
        result.stack = "Python";
        result.preset = "python";
        result.testCommand = "pytest";
      } catch {
        try {
          await fs.access(path.join(cwd, "go.mod"));
          result.stack = "Go";
          result.testCommand = "go test ./...";
        } catch {
          try {
            await fs.access(path.join(cwd, "Cargo.toml"));
            result.stack = "Rust";
            result.testCommand = "cargo test";
          } catch {
            // unknown stack stays
          }
        }
      }
    }
  }

  for (const candidate of ["src", "lib", "app", "apps", "packages", "services"]) {
    try {
      const stat = await fs.stat(path.join(cwd, candidate));
      if (stat.isDirectory()) {
        result.roots.push(candidate);
      }
    } catch {
      // missing
    }
  }

  result.hasCompose =
    (await pathExists(path.join(cwd, "Dockerfile"))) ||
    (await dirHasFilesMatching(cwd, /^docker-compose.*\.(ya?ml)$/i));
  result.hasTerraform =
    (await pathExists(path.join(cwd, "terraform"))) ||
    (await dirHasFilesMatching(cwd, /\.tf$/i));
  result.hasHelm =
    (await pathExists(path.join(cwd, "charts"))) ||
    (await pathExists(path.join(cwd, "helm")));
  result.hasCi = await dirHasFilesMatching(
    path.join(cwd, ".github", "workflows"),
    /\.ya?ml$/i,
  );
  result.hasEvalHarness =
    (await pathExists(path.join(cwd, "evals"))) ||
    (await pathExists(path.join(cwd, "tests", "eval")));

  if (result.stack === "Python") {
    try {
      const pyproject = await readFileSafe(path.join(cwd, "pyproject.toml"));
      result.hasAiStack = /\[(project|tool\.poetry)\.[^\]]*?(llm|ai)[^\]]*\]/i.test(
        pyproject,
      );
    } catch {
      result.hasAiStack = false;
    }

    const platformSignals =
      result.hasCompose ||
      result.hasTerraform ||
      result.hasHelm ||
      result.hasCi ||
      result.hasAiStack ||
      result.hasEvalHarness;
    if (platformSignals) {
      result.preset = "python-platform";
    }
  }

  return result;
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listChildDirs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * @param {string} cwd
 * @returns {Promise<{ domain: string, hint: string }[]>}
 */
export async function detectDomainCandidates(cwd) {
  /** @type {Map<string, string>} */
  const domains = new Map();

  const addDomain = (rawName, hint) => {
    const slug = slugifyDomain(rawName);
    if (!slug || SKIP_DOMAIN_NAMES.has(slug)) {
      return;
    }
    if (!domains.has(slug)) {
      domains.set(slug, hint);
    }
  };

  const scanRoots = [
    ["packages", (name) => `packages/${name}`],
    ["apps", (name) => `apps/${name}`],
    ["services", (name) => `services/${name}`],
    ["domains", (name) => `domains/${name}`],
    ["src/domains", (name) => `src/domains/${name}`],
    ["src/modules", (name) => `src/modules/${name}`],
  ];

  for (const [root, hintFn] of scanRoots) {
    const rootPath = path.join(cwd, root);
    for (const name of await listChildDirs(rootPath)) {
      if (SKIP_DIRS.has(name)) {
        continue;
      }
      addDomain(name, hintFn(name));
    }
  }

  return [...domains.entries()]
    .map(([domain, hint]) => ({ domain, hint }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

/**
 * @param {{
 *   repoName: string,
 *   stack: ReturnType<typeof detectProjectStack> extends Promise<infer T> ? T : never,
 *   domains: { domain: string, hint: string }[],
 * }} input
 * @returns {string}
 */
export function buildProjectMarkdown(input) {
  const date = new Date().toISOString().slice(0, 10);
  const domainRows =
    input.domains.length === 0
      ? "| — | — | — |\n"
      : input.domains
          .map(
            (item) =>
              `| ${item.domain} | \`${item.hint}\` | \`.specs/domains/${item.domain}/spec.md\` |`,
          )
          .join("\n");

  const roots =
    input.stack.roots.length > 0 ? input.stack.roots.map((r) => `\`${r}/\``).join(", ") : "(none detected)";

  let stackLines = `- Runtime: ${input.stack.stack}\n- Test: ${input.stack.testCommand}\n- Source roots: ${roots}`;
  if (input.stack.lintCommand) {
    stackLines += `\n- Lint: ${input.stack.lintCommand}`;
  }
  const flags = [
    input.stack.hasCompose && "Docker/Compose",
    input.stack.hasTerraform && "Terraform",
    input.stack.hasHelm && "Helm",
    input.stack.hasCi && "CI workflows",
    input.stack.hasAiStack && "AI deps (pyproject)",
    input.stack.hasEvalHarness && "eval harness dir",
  ].filter(Boolean);
  if (flags.length) {
    stackLines += `\n- Platform signals: ${flags.join(", ")}`;
  }
  if (input.stack.preset) {
    stackLines += `\n- Suggested preset: \`${input.stack.preset}\``;
  }

  return `# Project: ${input.repoName}

> Generated by \`project-init\` on ${date}. Edit with owner-approved truth.

## Vision

(fill in — one paragraph on what this codebase delivers)

## Detected stack

${stackLines}

## Domain map

| Domain | Path hint | Spec |
| --- | --- | --- |
${domainRows}

## Constraints

- (fill in)

## Out of scope for agents

- (fill in)
`;
}

/**
 * @param {string} domain
 * @returns {string}
 */
export function buildDomainSpec(domain) {
  return `${domainSpecStub(domain, "project-init")}

> Brownfield stub — populate stable requirements here or fold features in with \`archive-feature\`.
`;
}

/**
 * @param {string[]} domains
 * @returns {string}
 */
function buildRoadmapPlanned(domains) {
  if (!domains.length) {
    return `- Review \`.specs/project/PROJECT.md\` and define domain boundaries with the owner\n`;
  }

  return domains
    .map(
      (domain) =>
        `- **${domain}** — draft \`.specs/domains/${domain}/spec.md\` from existing code (owner review)`,
    )
    .join("\n")
    .concat("\n");
}

/**
 * @param {string} cwd
 * @param {string[]} domains
 */
async function ensureRoadmap(cwd, domains, force) {
  const roadmapPath = path.join(cwd, ".specs/project/ROADMAP.md");
  await ensureDir(path.dirname(roadmapPath));

  const planned = buildRoadmapPlanned(domains);
  let content;

  try {
    content = await readFileSafe(roadmapPath);
  } catch {
    content = ROADMAP_HEADER.replace("## Planned\n", `## Planned\n\n${planned}`);
    await writeFileSafe(roadmapPath, content);
    return { created: true, updated: false, path: roadmapPath };
  }

  if (content.includes("## Planned") && !content.includes("project-init")) {
    const marker = "## Planned";
    const idx = content.indexOf(marker);
    const insertAt = idx + marker.length;
    const note = `\n\n<!-- project-init -->\n${planned}`;
    if (!force && content.includes("<!-- project-init -->")) {
      return { created: false, updated: false, path: roadmapPath, skipped: true };
    }
    content = `${content.slice(0, insertAt)}${note}${content.slice(insertAt)}`;
    await writeFileSafe(roadmapPath, content);
    return { created: false, updated: true, path: roadmapPath };
  }

  return { created: false, updated: false, path: roadmapPath, skipped: true };
}

/**
 * Initialize brownfield project memory from repo structure.
 *
 * @param {{
 *   cwd?: string,
 *   preset?: string,
 *   domains?: string[],
 *   skipDomains?: boolean,
 *   skipProject?: boolean,
 *   force?: boolean,
 *   dryRun?: boolean,
 * }} [options]
 */
export async function projectInit(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const stack = await detectProjectStack(cwd);
  const repoName = await readRepoName(cwd);

  let domains = options.domains?.map((d) => ({
    domain: assertSafeDomainSlug(d),
    hint: `(manual: ${d})`,
  }));

  if (!domains?.length && !options.skipDomains) {
    domains = await detectDomainCandidates(cwd);
  }

  domains = domains ?? [];

  const preset = options.preset ?? stack.preset ?? "default";

  if (options.dryRun) {
    return {
      dryRun: true,
      repoName,
      stack,
      preset,
      domains,
      planned: [],
    };
  }

  await initGuardrailsMemory(cwd);

  /** @type {string[]} */
  const planned = [];

  if (!options.skipProject) {
    const projectPath = path.join(cwd, ".specs/project/PROJECT.md");
    const content = buildProjectMarkdown({ repoName, stack, domains });
    if (options.force) {
      await writeFileSafe(projectPath, content);
      planned.push(".specs/project/PROJECT.md (written)");
    } else {
      const created = await writeFileIfMissing(projectPath, content);
      planned.push(
        created
          ? ".specs/project/PROJECT.md (created)"
          : ".specs/project/PROJECT.md (kept existing)",
      );
    }
  }

  if (!options.skipDomains && domains.length) {
    for (const { domain } of domains) {
      const domainDir = path.join(cwd, ".specs/domains", domain);
      await ensureDir(domainDir);
      const specPath = path.join(domainDir, "spec.md");
      const content = buildDomainSpec(domain);
      if (options.force) {
        await writeFileSafe(specPath, content);
        planned.push(`.specs/domains/${domain}/spec.md (written)`);
      } else {
        const created = await writeFileIfMissing(specPath, content);
        planned.push(
          created
            ? `.specs/domains/${domain}/spec.md (created)`
            : `.specs/domains/${domain}/spec.md (kept existing)`,
        );
      }
    }
  }

  const roadmap = await ensureRoadmap(
    cwd,
    domains.map((d) => d.domain),
    options.force,
  );
  if (roadmap.created) {
    planned.push(".specs/project/ROADMAP.md (created)");
  } else if (roadmap.updated) {
    planned.push(".specs/project/ROADMAP.md (updated planned section)");
  } else if (roadmap.skipped) {
    planned.push(".specs/project/ROADMAP.md (kept existing)");
  }

  const configResult = await initProjectConfig({
    cwd,
    preset,
    force: options.force,
  });
  if (configResult.created) {
    planned.push(`.specs/config.yaml (preset: ${preset})`);
  } else if (configResult.skipped) {
    planned.push(".specs/config.yaml (kept existing)");
  } else if (configResult.updated) {
    planned.push(`.specs/config.yaml (replaced, preset: ${preset})`);
  }

  if (!options.skipCodeIndex) {
    const roots = stack.roots?.length ? stack.roots : ["src", "lib"];
    try {
      const { code, stdout, stderr } = await runGuardrailsScriptCapture(
        "code-index",
        ["rebuild", "--roots", roots.join(",")],
        { cwd },
      );
      if (code === 0) {
        planned.push(
          `.specs/memory/code-index.json (rebuilt, roots: ${roots.join(", ")})`,
        );
      } else {
        planned.push(
          `code-index rebuild skipped (exit ${code})${stderr ? `: ${stderr.trim().slice(0, 120)}` : ""}`,
        );
      }
    } catch {
      planned.push("code-index rebuild skipped (Python gates unavailable)");
    }
  }

  return {
    dryRun: false,
    repoName,
    stack,
    preset,
    domains,
    planned,
  };
}
