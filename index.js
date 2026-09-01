#!/usr/bin/env node

import path from "node:path";

import { archiveFeature } from "./lib/archive.js";
import { projectInit } from "./lib/brownfield.js";
import { classifyChange, formatClassifyChange } from "./lib/classify-change.js";
import {
  checkBeforeComplete,
  checkBeforeEdit,
  evaluateExecuteContext,
  formatCheckBeforeEdit,
  formatContextGuardStatus,
} from "./lib/context-guard.js";
import { PACKAGE_VERSION, CLI_NAME } from "./lib/constants.js";
import { phaseContext } from "./lib/config.js";
import { doctor } from "./lib/doctor.js";
import {
  formatPolicyStatus,
  loadExecutionPolicy,
  loadPolicyState,
  recordAgentRun,
  recordTaskRetry,
  resolvePathCheck,
  savePolicyState,
} from "./lib/execution-policy.js";
import { featureInit } from "./lib/feature.js";
import {
  featureOverview,
  formatFeatureOverview,
} from "./lib/feature-overview.js";
import { featureStatus, formatFeatureStatus } from "./lib/feature-status.js";
import { GATE_COMMANDS, AUX_COMMANDS, runGate, runGuardrailsScript } from "./lib/gates.js";
import { install } from "./lib/install.js";
import { parsePlatformArg } from "./lib/platform-detect.js";
import {
  cleanupWorkspaces,
  formatWorkspaceList,
  formatWorkspaceResults,
  listWorkspaces,
  prepareWorkspaces,
} from "./lib/workspace-isolation.js";
import {
  formatDiscoverReport,
  formatPromoteMessage,
  reqAnalysisInit,
} from "./lib/req-analysis.js";
import {
  formatExplorationInit,
  formatExplorationStatus,
  formatExplorationValidation,
  getExplorationStatus,
  initExploration,
  normalizeCandidateId,
  recordExplorationDecision,
  validateExplorationArtifact,
} from "./lib/solution-exploration.js";
import {
  checkSandboxCommand,
  formatSandboxCheck,
  loadSandboxPolicy,
} from "./lib/sandbox-policy.js";
import {
  initProjectConfig,
  listPresets,
  loadPresetText,
} from "./lib/presets.js";

const USAGE = `Usage: ${CLI_NAME} <command> [args]

Commands:
  install                            Install skills, references, gates and .specs/ memory
    [--preset <name>]                Seed .specs/config.yaml from a built-in preset
    [--force-config]                 Replace existing config.yaml when using --preset
    [--all-platforms]                Install every skill tree (Cursor, Claude, Copilot, Codex)
    [--platform cursor|claude|copilot|codex]  Force a platform instead of auto-detect
  init-config [--preset <name>]      Create .specs/config.yaml (default preset: default)
    [--force]                        Replace existing config.yaml
  preset list                        List built-in config presets
  preset show <name>                 Print a preset YAML file
  project-init                       Map an existing repo into .specs/ project memory (brownfield)
    [--preset <name>]                Config preset (auto-detected when omitted)
    [--domains a,b,c]                Explicit domain slugs (overrides auto-detect)
    [--no-domains]                   Skip .specs/domains/ scaffolding
    [--no-project]                   Skip PROJECT.md generation
    [--force]                        Overwrite generated project/domain/config files
    [--dry-run]                      Print scan results without writing files
  feature-init "<description>"       Allocate NNN-slug feature, STATE, local branch (Tier 0)
    [--no-branch]                    Skip git checkout -b
    [--no-spec]                      Skip spec.md stub
  req-analysis init "<description>"    Scaffold requirements brief (/elicit phase)
    [--scope project|feature]          project = macro brief; feature = one delivery (default: feature)
    [--force]                          Replace existing brief scaffold
  req-analysis discover                List local kickoff sources (prd.md, kickoff.md, …)
  req-analysis promote                 Print next steps after brief approval
    [--scope project|feature]          Match the brief scope
  req-analysis validate [brief.md]     Gate: approved requirements brief before /specify
  req-analysis context                 Assemble kickoff + brief context for Specify
    [--scope project|feature]          Scope (default: project)
    [--slug <feature-slug>]            Feature slug when scope=feature
    [--json]                           Machine-readable output
  archive-feature [feature]          Fold verified feature into ROADMAP + domain spec; reset STATE
    [--domain <slug>]                Domain folder under .specs/domains/ (default: feature slug)
    [--skip-verify]                  Skip validate-state (tests / recovery only)
    [--no-roadmap]                   Skip ROADMAP update
    [--no-domain]                    Skip domain spec merge
    [--no-state]                     Skip STATE reset
  classify-change <desc> [files...]  Heuristic complexity tier (quick/simple/medium/complex)
    [--json]                         Machine-readable output
  feature-status [feature]           Artifact checklist + next step for a feature
    [--json]                         Machine-readable output
  feature-overview [feature]           REQ → task → evidence dashboard (markdown)
    [--write]                        Save .specs/features/<feature>/overview.md
    [--json]                         Machine-readable output (no markdown body)
  phase-context <phase>              Print .specs/config.yaml context + rules for a phase
  doctor [path]                      Audit guardrails readiness (score + next actions)
    [--json]                         Machine-readable output
    [--no-suggest]                   Hide per-check remediation hints
  workspace-prepare <feature>        Create isolated git worktrees for parallel tasks
    --tasks T1,T2                    Task ids to isolate (required)
    [--base-ref HEAD]                Base ref for new worktrees
    [--json]                         Machine-readable output
  workspace-cleanup <feature>        Remove isolated worktrees for a feature
    [--tasks T1,T2]                  Limit cleanup to specific tasks
    [--force]                        Force-remove dirty worktrees (recovery after worker FAIL)
    [--json]                         Machine-readable output
  workspace-list <feature>           List isolated worktrees for a feature
    [--json]                         Machine-readable output
  execution-policy status            Show configured budgets, scope, and runtime counters
    [--json]                         Machine-readable output
  execution-policy check-path <path> Check whether a relative path is allowed by scope policy
    [--op read|write|delete]         Intended operation (default: inferred from path)
    [--json]                         Machine-readable output
  execution-policy record-retry <task>  Increment retry counter for a task id (blocks at limit)
  execution-policy record-run        Increment agent-run counter (blocks at budget)
  memory-index rebuild               Rebuild SQLite memory index from .specs/ artifacts
  memory-index embed [--force]       Optional semantic embeddings (requires config + provider)
  memory-index status [--json]       Index chunk, embedding, and staleness stats
  memory-query --from <id>           Bounded context package from the knowledge graph
    [--depth N]                      Traversal depth (default 2)
    [--json]                         Machine-readable output
  memory-search <query>              Full-text search over indexed artifact chunks (FTS5)
    [--limit N]                      Max results (default 10)
    [--json]                         Machine-readable output
  memory-retrieve "<query>"          Hybrid retrieval (FTS + graph + optional semantic)
    [--mode fts|hybrid|semantic]     Strategy (default: hybrid)
    [--json]                         Machine-readable output
  episodes record --summary "…"      Capture working-session episodic memory
  episodes list|archive|prune|promote  Episodic lifecycle (working → episodic → promoted)
  code-index rebuild [--roots src,lib] Lightweight brownfield code map (not full RepoGraph)
  code-index search "<query>"        Search indexed files/symbols/imports
  sandbox status                     Show sandbox policy mode (off|warn|strict)
  sandbox check-command "<cmd>"      Soft OS sandbox — block/warn destructive shell commands
    [--json]                         Machine-readable output
  context-guard status               Execute readiness from STATE + tasks.md
    [--json]                         Machine-readable output
  context-guard check-edit <path>    Contextual guard before editing a file
    [--op read|write|delete]         Intended operation (default: inferred)
    [--no-strict-files]              Skip task Files allowlist check
    [--json]                         Machine-readable output
  context-guard check-complete       Contextual guard before claiming feature done
    [feature]                        Feature id (default: active in STATE)
    [--json]                         Machine-readable output
  solution-explore init <feature>    Start solution exploration from approved spec
    --candidates A,B[,C]             Candidate ids (required, at least two)
    [--labels "a,b,c"]               Optional labels aligned to candidate ids
    [--base-ref HEAD]                Base ref for candidate worktrees
    [--force]                        Replace existing exploration.md
    [--json]                         Machine-readable output
  solution-explore status [feature]  Show exploration candidates and decision state
    [--json]                         Machine-readable output
  solution-explore validate [feature]  Gate: comparison matrix complete before select
    [--json]                         Machine-readable output
  solution-explore select <feature>  Record exploration decision
    --candidate A                    Selected candidate id (required)
    [--merge B]                      Optional secondary candidate to merge from
    --rationale "…"                  Why this candidate won (required)
    [--cleanup]                      Remove non-selected candidate worktrees
    [--json]                         Machine-readable output
  validate-spec [spec.md|feature]    Closure gate for a feature spec
  analyze-artifacts [feature]        Cross-artifact consistency before task approval
  validate-tasks [tasks.md|feature]  Granularity gate for a task breakdown
  loop-plan [tasks.md|feature]       Next Execute wave — parallel groups + sub-agent hints
    [--json]                         Machine-readable plan for agents
  validate-traceability [feature]    REQ → tasks → validation coverage chain
  validate-ship-surface [feature]    Ship Surface + AI Surface when infra/AI paths in tasks
  validate-quick [quick-folder]      Quick-mode TASK.md / SUMMARY.md structural gate
  validate-req-analysis [brief.md]   Requirements brief gate before /specify (/elicit)
  validate-state [feature]           Completion gate before declaring a feature done
  check-commit --message "<msg>"     Conventional Commits gate
    [--staged]                       Also reject empty commits and oversized staged diffs
  check-suppressions                 Block noqa/eslint-disable/ts-ignore/skip in staged diff
  quality-checks [--json]            Run quality.checks from .specs/config.yaml (/verify)
  lessons <add|list|penalize|prune|promote|graduate|status>  Lessons engine
  --help                             Show this message
  --version                          Print the package version
`;

const [, , command, ...args] = process.argv;

if (command === "--version" || command === "-v" || command === "version") {
  console.log(PACKAGE_VERSION);
  process.exit(0);
} else if (!command || command === "--help" || command === "-h" || command === "help") {
  const out = command ? console.log : console.error;
  out(USAGE);
  process.exit(command ? 0 : 1);
} else if (command === "install") {
  try {
    const installOptions = {};
    let deprecatedCursorHooksFlag = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--preset") {
        installOptions.preset = args[++i];
        if (!installOptions.preset) {
          throw new Error("--preset requires a name. Run preset list.");
        }
      } else if (arg === "--force-config") {
        installOptions.forceConfig = true;
      } else if (arg === "--all-platforms") {
        installOptions.allPlatforms = true;
      } else if (arg === "--platform") {
        const platform = parsePlatformArg(args[++i] ?? "");
        if (!platform) {
          throw new Error(
            "--platform requires cursor, claude, copilot, or codex.",
          );
        }
        installOptions.platform = platform;
      } else if (arg === "--with-cursor-hooks" || arg === "--without-cursor-hooks") {
        deprecatedCursorHooksFlag = true;
      } else {
        throw new Error(`Unknown install flag: ${arg}`);
      }
    }

    if (deprecatedCursorHooksFlag) {
      console.warn(
        "⚠️  --with-cursor-hooks / --without-cursor-hooks are deprecated (removed in 4.3.0). " +
          "Running install normally; legacy hook artifacts are cleaned automatically.",
      );
    }

    if (installOptions.allPlatforms && installOptions.platform) {
      throw new Error("Use either --all-platforms or --platform, not both.");
    }

    await install(installOptions);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "init-config") {
  try {
    let preset = "default";
    let force = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--preset") {
        preset = args[++i];
        if (!preset) {
          throw new Error("--preset requires a name. Run preset list.");
        }
      } else if (arg === "--force") {
        force = true;
      } else {
        throw new Error(`Unknown init-config flag: ${arg}`);
      }
    }

    const result = await initProjectConfig({ preset, force });
    if (result.skipped) {
      console.log(`ℹ️  ${result.path} already exists — kept your file (use --force to replace)`);
    } else if (result.updated) {
      console.log(`✅ ${result.path} replaced from preset: ${result.preset}`);
    } else {
      console.log(`✅ ${result.path} created from preset: ${result.preset}`);
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "preset") {
  try {
    const sub = args[0];
    if (sub === "list") {
      const presets = await listPresets();
      console.log("Built-in presets:");
      for (const name of presets) {
        console.log(`  ${name}`);
      }
    } else if (sub === "show") {
      const name = args[1];
      if (!name) {
        throw new Error("Preset name required. Example: preset show node-ts");
      }
      process.stdout.write(await loadPresetText(name));
    } else {
      throw new Error("Usage: preset list | preset show <name>");
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "project-init") {
  try {
    const initOptions = {
      skipDomains: false,
      skipProject: false,
      force: false,
      dryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--preset") {
        initOptions.preset = args[++i];
        if (!initOptions.preset) {
          throw new Error("--preset requires a name. Run preset list.");
        }
      } else if (arg === "--domains") {
        const raw = args[++i];
        if (!raw) {
          throw new Error("--domains requires a comma-separated list.");
        }
        initOptions.domains = raw.split(",").map((item) => item.trim()).filter(Boolean);
      } else if (arg === "--no-domains") {
        initOptions.skipDomains = true;
      } else if (arg === "--no-project") {
        initOptions.skipProject = true;
      } else if (arg === "--force") {
        initOptions.force = true;
      } else if (arg === "--dry-run") {
        initOptions.dryRun = true;
      } else {
        throw new Error(`Unknown project-init flag: ${arg}`);
      }
    }

    const result = await projectInit(initOptions);

    if (result.dryRun) {
      console.log(`🔍 Brownfield scan: ${result.repoName}`);
      console.log(`   Stack: ${result.stack.stack}`);
      console.log(`   Preset: ${result.preset}`);
      if (result.domains.length) {
        console.log(`   Domains: ${result.domains.map((d) => d.domain).join(", ")}`);
      } else {
        console.log("   Domains: (none detected — use --domains or add code layout)");
      }
      console.log("   Dry run — no files written.");
      process.exit(0);
    }

    console.log(`✅ Brownfield project memory initialized for ${result.repoName}`);
    console.log(`   Stack: ${result.stack.stack}`);
    console.log(`   Preset: ${result.preset}`);
    for (const line of result.planned) {
      console.log(`   ${line}`);
    }
    console.log("   Tier 0 — review PROJECT.md and domain stubs, then run feature-init.");
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "feature-init") {
  try {
    const descriptionParts = [];
    const initOptions = { skipBranch: false, skipSpec: false };

    for (const arg of args) {
      if (arg === "--no-branch") {
        initOptions.skipBranch = true;
      } else if (arg === "--no-spec") {
        initOptions.skipSpec = true;
      } else {
        descriptionParts.push(arg);
      }
    }

    const description = descriptionParts.join(" ").trim();
    const result = await featureInit(description, initOptions);

    console.log(`✅ Feature ${result.featureId}`);
    console.log(`   Directory: ${result.featureDir}`);
    console.log(`   Branch: ${result.branchName}`);
    console.log(`   Git: ${result.branchMessage}`);
    console.log("   Tier 0 complete — draft spec.md, then run validate-spec.");
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "archive-feature") {
  try {
    const archiveOptions = {
      skipVerify: false,
      skipRoadmap: false,
      skipDomainMerge: false,
      skipState: false,
    };
    const positional = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--skip-verify") {
        archiveOptions.skipVerify = true;
      } else if (arg === "--no-roadmap") {
        archiveOptions.skipRoadmap = true;
      } else if (arg === "--no-domain") {
        archiveOptions.skipDomainMerge = true;
      } else if (arg === "--no-state") {
        archiveOptions.skipState = true;
      } else if (arg === "--domain") {
        archiveOptions.domain = args[++i];
        if (!archiveOptions.domain) {
          throw new Error("--domain requires a slug argument.");
        }
      } else {
        positional.push(arg);
      }
    }

    const result = await archiveFeature(positional[0], archiveOptions);

    console.log(`✅ Archived ${result.featureId}`);
    if (result.roadmapPath) {
      console.log(`   ROADMAP: ${result.roadmapPath}${result.roadmapUpdated ? " (updated)" : ""}`);
    }
    if (result.domainPath) {
      console.log(`   Domain: ${result.domainPath}`);
      if (result.mergeSummary.length) {
        console.log(`   Merge: ${result.mergeSummary.join(", ")}`);
      }
    }
    if (result.stateReset) {
      console.log("   STATE: reset for next feature");
    }
    console.log("   Tier 0 — commit archive updates locally; push needs owner go-ahead.");
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "phase-context") {
  try {
    const phase = args[0];
    if (!phase) {
      throw new Error("Phase is required. Example: phase-context specify");
    }
    const output = await phaseContext(phase);
    process.stdout.write(output);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "doctor") {
  try {
    const doctorOptions = { json: false, suggest: true };
    const positional = [];

    for (const arg of args) {
      if (arg === "--json") {
        doctorOptions.json = true;
      } else if (arg === "--no-suggest") {
        doctorOptions.suggest = false;
      } else {
        positional.push(arg);
      }
    }

    const target = positional[0] ? path.resolve(positional[0]) : process.cwd();
    await doctor(target, doctorOptions);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "workspace-prepare") {
  try {
    let json = false;
    let baseRef = "HEAD";
    let tasksRaw = "";
    const positional = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--json") {
        json = true;
      } else if (arg === "--base-ref") {
        baseRef = args[++i];
        if (!baseRef) {
          throw new Error("--base-ref requires a git ref");
        }
      } else if (arg === "--tasks") {
        tasksRaw = args[++i] ?? "";
        if (!tasksRaw) {
          throw new Error("--tasks requires a comma-separated list (e.g. T1,T2)");
        }
      } else {
        positional.push(arg);
      }
    }

    const featureId = positional[0];
    if (!featureId) {
      throw new Error("Usage: workspace-prepare <feature> --tasks T1,T2");
    }

    const taskIds = tasksRaw.split(",").map((item) => item.trim()).filter(Boolean);
    const results = await prepareWorkspaces(process.cwd(), { featureId, taskIds, baseRef });
    process.stdout.write(formatWorkspaceResults(results, { json }));

    if (results.some((item) => item.status === "failed")) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "workspace-cleanup") {
  try {
    let json = false;
    let force = false;
    let tasksRaw = "";
    const positional = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--json") {
        json = true;
      } else if (arg === "--force") {
        force = true;
      } else if (arg === "--tasks") {
        tasksRaw = args[++i] ?? "";
      } else {
        positional.push(arg);
      }
    }

    const featureId = positional[0];
    if (!featureId) {
      throw new Error("Usage: workspace-cleanup <feature> [--tasks T1,T2] [--force]");
    }

    const taskIds = tasksRaw
      ? tasksRaw.split(",").map((item) => item.trim()).filter(Boolean)
      : undefined;
    const results = await cleanupWorkspaces(process.cwd(), { featureId, taskIds, force });
    process.stdout.write(formatWorkspaceResults(results, { json }));

    if (results.some((item) => item.status === "failed")) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "workspace-list") {
  try {
    let json = false;
    const positional = [];

    for (const arg of args) {
      if (arg === "--json") {
        json = true;
      } else {
        positional.push(arg);
      }
    }

    const featureId = positional[0];
    if (!featureId) {
      throw new Error("Usage: workspace-list <feature> [--json]");
    }

    const workspaces = await listWorkspaces(process.cwd(), featureId);
    process.stdout.write(formatWorkspaceList(workspaces, { json, featureId }));
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "execution-policy") {
  try {
    const sub = args[0];
    let json = false;
    const rest = [];

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--json") {
        json = true;
      } else {
        rest.push(args[i]);
      }
    }

    const cwd = process.cwd();
    const policy = await loadExecutionPolicy(cwd);
    const state = await loadPolicyState(cwd);

    if (sub === "status") {
      process.stdout.write(formatPolicyStatus(policy, state, { json }));
    } else if (sub === "check-path") {
      let operation;
      const positional = [];

      for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (arg === "--op") {
          operation = rest[++i];
          if (!operation) {
            throw new Error("--op requires read, write, or delete");
          }
        } else {
          positional.push(arg);
        }
      }

      const relativePath = positional[0];
      if (!relativePath) {
        throw new Error(
          "Usage: execution-policy check-path <relative-path> [--op read|write|delete]",
        );
      }
      const result = resolvePathCheck(relativePath, policy, { operation });
      if (json) {
        console.log(JSON.stringify({ path: relativePath, ...result }, null, 2));
      } else {
        const label = result.allowed
          ? result.severity === "warning"
            ? "allowed (warn)"
            : "allowed"
          : result.severity === "warning"
            ? "blocked (warn)"
            : "blocked";
        console.log(
          `${relativePath} [${result.operation}]: ${label} (${result.reason})`,
        );
      }
      if (result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
    } else if (sub === "record-retry") {
      const taskId = rest[0];
      if (!taskId) {
        throw new Error("Usage: execution-policy record-retry <task-id>");
      }
      const recorded = recordTaskRetry(state, taskId, policy);
      if (!recorded.ok) {
        console.error(`❌ ${recorded.message}`);
        process.exit(1);
      }
      await savePolicyState(cwd, recorded.state);
      if (json) {
        console.log(
          JSON.stringify({ taskId, retries: recorded.retries, state: recorded.state }, null, 2),
        );
      } else {
        console.log(`Recorded retry for ${taskId}: ${recorded.retries}`);
      }
    } else if (sub === "record-run") {
      const recorded = recordAgentRun(state, policy);
      if (!recorded.ok) {
        console.error(`❌ ${recorded.message}`);
        process.exit(1);
      }
      await savePolicyState(cwd, recorded.state);
      if (json) {
        console.log(
          JSON.stringify({ agent_runs: recorded.state.agent_runs, state: recorded.state }, null, 2),
        );
      } else {
        console.log(
          `Recorded agent run: ${recorded.state.agent_runs}/${policy.budget.max_agent_runs}`,
        );
      }
    } else {
      throw new Error(
        "Usage: execution-policy status | check-path <path> | record-retry <task> | record-run",
      );
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "sandbox") {
  try {
    const sub = args[0];
    let json = false;
    /** @type {string[]} */
    const rest = [];

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--json") {
        json = true;
      } else {
        rest.push(args[i]);
      }
    }

    const cwd = process.cwd();
    const policy = await loadSandboxPolicy(cwd);

    if (sub === "status") {
      if (json) {
        console.log(
          JSON.stringify(
            {
              mode: policy.mode,
              deny_rules: policy.deny_patterns.map((rule) => rule.id),
            },
            null,
            2,
          ),
        );
      } else {
        console.log(
          `Sandbox mode: ${policy.mode} (${policy.deny_patterns.length} deny rule(s))`,
        );
      }
    } else if (sub === "check-command") {
      const shellCommand = rest.join(" ").trim();
      if (!shellCommand) {
        throw new Error('Usage: sandbox check-command "<shell command>" [--json]');
      }
      const result = checkSandboxCommand(shellCommand, policy);
      process.stdout.write(formatSandboxCheck(result, shellCommand, { json }));
      if (!result.allowed) {
        process.exit(1);
      }
    } else {
      throw new Error('Usage: sandbox status | check-command "<cmd>" [--json]');
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "context-guard") {
  try {
    const sub = args[0];
    let json = false;
    const rest = [];

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--json") {
        json = true;
      } else {
        rest.push(args[i]);
      }
    }

    const cwd = process.cwd();

    if (sub === "status") {
      const context = await evaluateExecuteContext(cwd);
      process.stdout.write(formatContextGuardStatus(context, { json }));
      if (!context.ok && context.severity === "blocking") {
        process.exit(1);
      }
    } else if (sub === "check-edit") {
      let operation;
      let strictFiles = true;
      const positional = [];

      for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (arg === "--no-strict-files") {
          strictFiles = false;
        } else if (arg === "--op") {
          operation = rest[++i];
          if (!operation) {
            throw new Error("--op requires read, write, or delete");
          }
        } else {
          positional.push(arg);
        }
      }

      const relativePath = positional[0];
      if (!relativePath) {
        throw new Error(
          "Usage: context-guard check-edit <relative-path> [--op read|write|delete] [--no-strict-files]",
        );
      }

      const result = await checkBeforeEdit(cwd, relativePath, { operation, strictFiles });
      process.stdout.write(formatCheckBeforeEdit(result, relativePath, { json }));
      if (result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
    } else if (sub === "check-complete") {
      const featureId = rest[0];
      const result = await checkBeforeComplete(cwd, featureId);
      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const label = result.allowed ? "ready" : "blocked";
        console.log(`Feature ${result.featureId}: ${label}`);
        for (const message of result.messages) {
          console.log(`  ${message}`);
        }
      }
      if (result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
    } else {
      throw new Error(
        "Usage: context-guard status | check-edit <path> | check-complete [feature]",
      );
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "solution-explore") {
  try {
    const sub = args[0];
    let json = false;
    const rest = [];

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--json") {
        json = true;
      } else {
        rest.push(args[i]);
      }
    }

    const cwd = process.cwd();

    if (sub === "init") {
      let candidatesRaw = "";
      let labelsRaw = "";
      let baseRef = "HEAD";
      let force = false;
      const positional = [];

      for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (arg === "--candidates") {
          candidatesRaw = rest[++i] ?? "";
        } else if (arg === "--labels") {
          labelsRaw = rest[++i] ?? "";
        } else if (arg === "--base-ref") {
          baseRef = rest[++i];
          if (!baseRef) {
            throw new Error("--base-ref requires a git ref");
          }
        } else if (arg === "--force") {
          force = true;
        } else {
          positional.push(arg);
        }
      }

      const featureId = positional[0];
      if (!featureId || !candidatesRaw) {
        throw new Error(
          "Usage: solution-explore init <feature> --candidates A,B [--labels \"a,b\"] [--base-ref HEAD] [--force]",
        );
      }

      const ids = candidatesRaw.split(",").map((item) => item.trim()).filter(Boolean);
      const labels = labelsRaw
        ? labelsRaw.split(",").map((item) => item.trim())
        : [];
      const candidateSpecs = ids.map((id, index) => ({
        id: normalizeCandidateId(id),
        label: labels[index] || undefined,
      }));

      const result = await initExploration(cwd, featureId, candidateSpecs, { baseRef, force });
      process.stdout.write(formatExplorationInit(result, { json }));

      if (result.workspaces.some((item) => item.status === "failed")) {
        process.exit(1);
      }
    } else if (sub === "status") {
      const featureId = rest[0];
      const status = await getExplorationStatus(cwd, featureId);
      process.stdout.write(formatExplorationStatus(status, { json }));
    } else if (sub === "validate") {
      const featureId = rest[0];
      const result = await validateExplorationArtifact(cwd, featureId);
      process.stdout.write(formatExplorationValidation(result, { json }));
      if (!result.ok) {
        process.exit(1);
      }
    } else if (sub === "select") {
      let selected = "";
      let mergedFrom = "";
      let rationale = "";
      let cleanup = false;
      const positional = [];

      for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (arg === "--candidate") {
          selected = rest[++i] ?? "";
        } else if (arg === "--merge") {
          mergedFrom = rest[++i] ?? "";
        } else if (arg === "--rationale") {
          rationale = rest[++i] ?? "";
        } else if (arg === "--cleanup") {
          cleanup = true;
        } else {
          positional.push(arg);
        }
      }

      const featureId = positional[0];
      if (!featureId || !selected || !rationale) {
        throw new Error(
          'Usage: solution-explore select <feature> --candidate A --rationale "…" [--merge B] [--cleanup]',
        );
      }

      const result = await recordExplorationDecision(cwd, featureId, {
        selected,
        mergedFrom: mergedFrom || null,
        rationale,
        cleanup,
      });

      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Recorded decision for ${result.featureId}: ${result.selected}`);
        if (result.mergedFrom) {
          console.log(`  Merged from: ${result.mergedFrom}`);
        }
        if (result.cleanup?.length) {
          for (const item of result.cleanup) {
            console.log(`  Cleanup ${path.basename(item.path)}: ${item.status}`);
          }
        }
      }
    } else {
      throw new Error(
        "Usage: solution-explore init | status | validate | select",
      );
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "req-analysis") {
  try {
    const sub = args[0];
    const rest = args.slice(1);

    if (sub === "init") {
      let scope = "feature";
      let force = false;
      const positional = [];
      for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        if (arg === "--force") {
          force = true;
        } else if (arg === "--scope" && rest[i + 1]) {
          scope = rest[i + 1];
          i += 1;
        } else if (arg.startsWith("--scope=")) {
          scope = arg.slice("--scope=".length);
        } else if (!arg.startsWith("--")) {
          positional.push(arg);
        }
      }
      const description = positional.join(" ").trim();
      if (scope === "feature" && !description) {
        throw new Error(
          'Usage: req-analysis init "<description>" [--scope project|feature] [--force]',
        );
      }
      const result = await reqAnalysisInit(description, { scope, force });
      console.log(`✅ Elicitation scaffold (${result.scope})`);
      for (const briefPath of result.paths) {
        console.log(`   ${briefPath}`);
      }
      console.log("");
      console.log(await formatDiscoverReport(process.cwd()));
    } else if (sub === "discover") {
      console.log(await formatDiscoverReport(process.cwd()));
    } else if (sub === "promote") {
      let scope = "feature";
      let description = "";
      for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        if (arg.startsWith("--scope=")) {
          scope = arg.slice("--scope=".length);
        } else if (arg === "--scope" && rest[i + 1]) {
          scope = rest[i + 1];
          i += 1;
        } else if (!arg.startsWith("--")) {
          description = `${description} ${arg}`.trim();
        }
      }
      console.log(formatPromoteMessage({ scope, description }));
    } else if (sub === "validate") {
      const briefPath = rest.find((arg) => !arg.startsWith("--"));
      const code = await runGate("validate-req-analysis", briefPath ? [briefPath] : []);
      process.exit(code);
    } else if (sub === "context") {
      let scope = "project";
      let slug = "";
      let json = false;
      for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        if (arg === "--json") {
          json = true;
        } else if (arg === "--scope" && rest[i + 1]) {
          scope = rest[i + 1];
          i += 1;
        } else if (arg.startsWith("--scope=")) {
          scope = arg.slice("--scope=".length);
        } else if (arg === "--slug" && rest[i + 1]) {
          slug = rest[i + 1];
          i += 1;
        } else if (arg.startsWith("--slug=")) {
          slug = arg.slice("--slug=".length);
        }
      }
      const scriptArgs = ["--scope", scope];
      if (slug) {
        scriptArgs.push("--slug", slug);
      }
      if (json) {
        scriptArgs.push("--json");
      }
      const code = await runGuardrailsScript("req-context", scriptArgs);
      process.exit(code);
    } else {
      throw new Error("Usage: req-analysis init | discover | promote | validate | context");
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "classify-change") {
  try {
    let json = false;
    const positional = [];
    for (const arg of args) {
      if (arg === "--json") {
        json = true;
      } else {
        positional.push(arg);
      }
    }
    if (positional.length === 0) {
      throw new Error(
        'Description or files required. Example: classify-change "fix theme toggle" src/hooks/useTheme.ts',
      );
    }
    const files = positional.filter((item) => /[\\/]|\.[a-z0-9]+$/i.test(item));
    const descriptionParts = positional.filter((item) => !files.includes(item));
    const result = classifyChange({
      description: descriptionParts.join(" "),
      files,
    });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      process.stdout.write(formatClassifyChange(result));
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "feature-status") {
  try {
    let json = false;
    const positional = [];
    for (const arg of args) {
      if (arg === "--json") {
        json = true;
      } else {
        positional.push(arg);
      }
    }
    const status = await featureStatus(positional[0]);
    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      process.stdout.write(formatFeatureStatus(status));
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (command === "feature-overview") {
  try {
    let json = false;
    let write = false;
    const positional = [];
    for (const arg of args) {
      if (arg === "--json") {
        json = true;
      } else if (arg === "--write") {
        write = true;
      } else {
        positional.push(arg);
      }
    }
    const overview = await featureOverview(positional[0], { write });
    if (json) {
      console.log(JSON.stringify(overview, null, 2));
    } else {
      process.stdout.write(formatFeatureOverview(overview));
      if (overview.writtenTo) {
        process.stderr.write(`\nWrote ${overview.writtenTo}\n`);
      }
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
} else if (AUX_COMMANDS.includes(command)) {
  try {
    const code = await runGuardrailsScript(command, args);
    process.exit(code);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(2);
  }
} else if (GATE_COMMANDS.includes(command)) {
  try {
    const code = await runGate(command, args);
    process.exit(code);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(2);
  }
} else {
  console.error(USAGE);
  process.exit(1);
}
