---
name: agent-architecture
description: Spec-Driven Development hub for AI-assisted engineering. Progressive disclosure (~70% fewer skill tokens vs dumping the full kit). Adaptive phases with Python gates, independent verifier, discrimination sensor, evidence-or-zero, and .specs/ memory. Triggers on "specify feature", "elicit", "design", "break into tasks", "implement", "verify", "quick fix", "resume work", "handoff".
---

# Agent Architecture (Hub)

Spec-Driven Development (SDD) guardrails for AI-assisted software engineering.
Replaces "Vibe Coding" with adaptive phases backed by persistent memory, sister skills, and gates enforced by code.

**Token cost.** Load a working set, not the archive — see `references/context-limits.md`. Progressive phase loading is ~70% fewer skill tokens than dumping hub + all references + sister skills every turn; a Medium feature is typically ~80% cheaper in skill tokens than naive full reloads.

This file is the contract and the map. Phase procedures live in `references/`; cross-cutting concerns live in sister skills.

## Critical Rules (read before acting)

**Reference files.** Phase procedures live in `references/` next to this file (`.cursor/skills/references/`, `.claude/skills/references/`, `.github/skills/references/`, `.codex/skills/references/` — use the tree your agent loads). Read a reference **completely** before acting on it. Never act on a partial read. Load the working set per `references/context-limits.md` — one feature at a time, current phase only.

**Gate scripts.** Structural gates live in `.specs/guardrails/scripts/` at the project root. Run them with `python3`; never assume a project-local `scripts/` directory belongs to Spec Guardrails.

**Execution contract — non-negotiable, holds even if no reference file is open:**

1. **Test-First Imperative** — Tests derive from the spec's acceptance criteria and assert spec-defined outcomes. They never mirror the implementation. No production code before spec and derived tests are approved.
2. **Gate before done** — A task is complete only when the project harness (tests, linter, compiler) passes. The runner decides, never self-assessment.
3. **One atomic commit per task** — Mark the task complete in `tasks.md` and include that update in the same commit. Never batch tasks; never weaken, skip, or delete tests to make them pass.
4. **Author ≠ verifier** — After the last task, `/verify` runs with a fresh, clean context that never wrote the code. It is mandatory, not prompted.
5. **Blast radius (git tiers)** — Approving a spec or tasks authorizes **Tier 0** local work only. Higher tiers need owner go-ahead.

| Tier | Authorized by spec/tasks approval | Owner go-ahead required |
| --- | --- | --- |
| **0 — Local sandbox** | `feature-init`, feature folder, `git checkout -b feat/NNN-slug`, local commits (code + `.specs/`) | — |
| **1 — Share** | — | `git push`, open/update PR for this feature |
| **2 — External impact** | — | merge to default branch, deploy/release, force-push, production data or secrets |

Quick tier skips dedicated feature branches — commit on the current branch. See `git-handoff.md` for phase triggers.

## Deterministic Gates

Structural gates run **before** owner review, so they cannot drift when the model forgets a step.

| When | Command |
| --- | --- |
| Before `/specify` (Medium+) | `npx @luizsantiago/spec-guardrails feature-init "<description>"` (Tier 0) |
| Optional elicitation (vague kickoff or request) | `/elicit` → `req-analysis init` — **suggested only**; `require_brief*` config may block `validate-spec` on Complex |
| Optional project config | `init-config --preset node-ts` or `install --preset python` (see `preset list`) |
| Before confirming a spec | `python3 .specs/guardrails/scripts/validate_spec.py [feature]` |
| Before Tasks (Complex / Medium+ design) | `python3 .specs/guardrails/scripts/validate_design.py [feature]` |
| Before approving tasks | `python3 .specs/guardrails/scripts/analyze_artifacts.py [feature]` |
| Before presenting tasks for approval | `python3 .specs/guardrails/scripts/validate_tasks.py [feature]` |
| Before Execute waves (3+ tasks) | `npx @luizsantiago/spec-guardrails loop-plan [feature]` |
| Parallel wave (2+ tasks, disjoint Files) | `npx @luizsantiago/spec-guardrails workspace-prepare [feature] --tasks T1,T2` |
| After parallel wave merge | `npx @luizsantiago/spec-guardrails workspace-cleanup [feature] --force` |
| Before editing paths outside task Files | `npx @luizsantiago/spec-guardrails context-guard check-edit <path> [--op write]` |
| Before claiming feature complete | `npx @luizsantiago/spec-guardrails context-guard check-complete [feature]` |
| Session episodic note | `npx @luizsantiago/spec-guardrails episodes record --summary "…"` |
| Brownfield code lookup | `npx @luizsantiago/spec-guardrails code-index rebuild` · `code-index search "…"` |
| Shell safety check | `npx @luizsantiago/spec-guardrails sandbox check-command "<cmd>"` |
| Solution exploration (explicit) | `npx @luizsantiago/spec-guardrails solution-explore init <feature> --candidates A,B` |
| Before exploration decision | `npx @luizsantiago/spec-guardrails solution-explore validate [feature]` |
| Retrieve related context | `npx @luizsantiago/spec-guardrails memory-retrieve "<query>"` |
| Rebuild / embed memory index | `npx @luizsantiago/spec-guardrails memory-index rebuild` · `memory-index embed` |
| On gate retry (Execute playbook) | `npx @luizsantiago/spec-guardrails execution-policy record-retry Tn` |
| On each commit | `python3 .specs/guardrails/scripts/check_commit.py --message "<message>"` · `check_commit.py --staged` |
| Before each commit (staged diff) | `python3 .specs/guardrails/scripts/check_suppressions.py` |
| During Verify, when `quality.checks` is configured | `python3 .specs/guardrails/scripts/run_quality_checks.py` |
| Before declaring a feature done | `python3 .specs/guardrails/scripts/validate_state.py [feature]` |
| Traceability (Medium+ features) | `python3 .specs/guardrails/scripts/validate_traceability.py [feature]` |
| Ship / AI Surface (when infra or AI paths in tasks) | `python3 .specs/guardrails/scripts/validate_ship_surface.py [feature]` |
| Quick mode evidence | `python3 .specs/guardrails/scripts/validate_quick.py [feature]` |
| After Verify PASS | `npx @luizsantiago/spec-guardrails archive-feature [feature]` (Tier 0) |
| Before a phase procedure (optional) | `npx @luizsantiago/spec-guardrails phase-context <phase>` |
| Feature dashboard (human-readable) | `npx @luizsantiago/spec-guardrails feature-overview [feature] [--write]` |
| After a FAIL verdict | `python3 .specs/guardrails/scripts/lessons.py add --source .specs/features/[feature]/validation.md` |

Gates accept a feature name, a feature directory, or a path to the artifact. With no argument they auto-detect when the project has exactly one feature; with several they list candidates and exit 2. A spec is rejected unless every criterion uses `SHALL` or `MUST` and `## Assumptions` is present.

A **non-zero exit means STOP** — fix the artifact, then re-run the gate. Never continue past a failing gate.

**Process mode (Brakes off).** If Python 3.10+ or shell execution is unavailable, say so once, then perform the same checks by reading the artifact against the reference checklist. Process mode never lowers the standard; it only changes who runs the check. Run `doctor` to see separate **Process** and **Brakes** scores.

## Phase Map

```
EXPLORE (optional) → ELICIT (optional) → SPECIFY → DISCUSS (conditional) → DESIGN (optional) → TASKS (optional) → ANALYZE → EXECUTE (loop) → VERIFY → ARCHIVE
```

| Phase | Required | Reference | Sister skill | Gate |
| --- | --- | --- | --- | --- |
| **Explore** | Optional | `references/explore.md` | — | — |
| **Elicit** | Optional | `references/elicitation.md` | — | `validate_req_analysis.py` (before `/specify`; suggest-only entry) |
| **Constitution** | Once per project | `references/constitution.md` | — | — |
| **Specify** | Yes | `references/specify.md` | — | `validate_spec.py` |
| **Discuss** | Conditional | `references/discuss.md` | — | — |
| **Design** | No | `references/design.md` | — | `validate_design.py` (when design.md exists, Medium+) |
| **Tasks** | No | `references/tasks.md` | `task-graph-engineering.md` | `validate_tasks.py` |
| **Analyze** | Before task approval | `references/analyze.md` | — | `analyze_artifacts.py` |
| **Execute** | Yes | `references/implement.md` | `engineering-standards.md` | `check_commit.py`, `check_suppressions.py` |
| **Verify** | Yes | `references/validate.md` | `security-review.md` | `validate_traceability.py`, `validate_ship_surface.py`, `validate_state.py`, `run_quality_checks.py` |
| **Archive** | After Verify PASS | `references/archive.md` | `git-handoff.md` | `archive-feature` |
| **Converge** | On drift | `references/converge.md` | — | `analyze_artifacts.py` |
| **Handoff** | Yes | `references/memory.md` | `git-handoff.md` | — |
| **Quick** | Alternative | `references/quick-mode.md` | — | `check_commit.py`, `check_suppressions.py`, `validate_quick.py` |
| **Context** | Always | `references/context-limits.md` | — | — |
| **Sub-agents** | When batched | `references/sub-agents.md` | `task-graph-engineering.md` | — |
| **Solution exploration** | Explicit fork | `references/solution-exploration.md` | — | `solution-explore validate` |
| **Lessons** | On FAIL | `references/lessons.md` | — | `lessons.py` |

Context is a load rule, not a pipeline phase. Read it when the session is long or the feature has more than a handful of tasks. Sub-agents is the Execute scaling protocol — offer only when the task graph needs more than one batch; see `references/sub-agents.md`. Lessons is a FAIL-path step, not a sequential phase — see `references/lessons.md`.

## Conditional sister skills

Not in the default phase-map cell. Load only on `/verify` after `validate.md` + `security-review.md`, and **at most one in context at a time**.

| Skill | Load when | Skip when |
| --- | --- | --- |
| `appsec.md` | **Complex**, or auth / payments / PII / secrets / upload / SSRF / network trust boundary | Quick; Simple without those surfaces; copy/docs/styling |
| `qa-strategy.md` | **Complex**, or multi-step user-facing flow, or owner asked for regression/QA | Quick; Simple one-file; evidence-or-zero alone is enough |
| `python-devops.md` | Infra/docker/terraform/helm/CI paths in tasks, or `python-platform` preset | No deploy surface in the change |
| `ai-engineering.md` | LLM/RAG/MCP/agent/prompt paths or classify-change AI signal | No AI paths in tasks |

**Sequence.** If both AppSec and QA triggers fire: AppSec → write `## AppSec` → **drop** `appsec.md` → QA → write `## QA`. Never load AppSec + QA together. For platform work, `python-devops.md` and `ai-engineering.md` are independent of Verify sisters — load at most one on-demand sister during Design/Tasks/Execute when paths match; never with AppSec/QA in the same window.

## Complexity Router

Complexity determines depth. Do not run every phase on every change.

| Tier | Scope | Path |
| --- | --- | --- |
| **Quick** | ≤3 files, no design decisions, no new dependencies | `references/quick-mode.md` — describe, implement, verify, commit; gates: `check_commit.py`, `check_suppressions.py`, `validate-quick` |
| **Simple** | 2–5 files, localized change | Specify → Execute → Verify |
| **Medium** | New feature, <10 tasks | Specify → Tasks → Execute → Verify |
| **Complex** | New architecture, API surface, infra | Specify → Discuss → Design → Tasks → Execute → Verify |
| **Parallel** | Splittable work, multiple agents | Above + `/task-graph` per `task-graph-engineering.md` |

**Hub Medium vs gate Medium+.** Router tiers above choose phase depth (hub **Medium** = new feature, under 10 tasks). The completion gate’s **Medium+** is separate: `design.md` with content, **or** 4+ tasks, **or** 2+ phases — that is when a discrimination-sensor outcome is blocking. A hub-Medium feature with only three tasks can be below gate Medium+.

**Rules**

- **Specify and Verify are always required on the full pipeline** — you must know WHAT was asked and prove it was delivered. **Quick** is the exception: the express lane in `references/quick-mode.md` (describe → implement → verify → commit) with `check_commit.py`, `check_suppressions.py` on each commit, and `validate-quick` as the close/evidence gate.
- **Design is skipped** when there are no architectural decisions and no new patterns.
- **Tasks is skipped** when there are ≤3 obvious steps.
- **Discuss is triggered inside Specify** when the feature touches persistence, external calls, auth, payments, concurrency, or state transitions, or when the owner's intent is ambiguous.
- **Elicit is suggested (never required)** when a kickoff brief exists without an approved project brief, or when the owner's request is vague ("add interface", "improve X") — see `references/elicitation.md`. If the owner chooses `/specify` directly, proceed.
- **Safety valve** — Even when Tasks is skipped, Execute starts by listing atomic steps inline. If that listing reveals more than 5 steps or real dependencies, STOP and create a formal `tasks.md`; the Tasks phase was skipped in error.

When in doubt, start at **Medium** and drop phases only with owner approval.

## Persistent Memory (`.specs/`)

| Path | Purpose |
| --- | --- |
| `.specs/STATE.md` | Decision log (`AD-NNN`) and handoff snapshot |
| `.specs/lessons.json` | Canonical lessons store, owned by `lessons.py` |
| `.specs/LESSONS.md` | Generated playbook of confirmed lessons — read, never write |
| `.specs/project/PROJECT.md` | Vision, stack, constraints (when the project defines them) |
| `.specs/project/CONSTITUTION.md` | Governing principles (when Constitution ran) |
| `.specs/project/ROADMAP.md` | Milestones and feature status |
| `.specs/project/kickoff.md` | Owner kickoff brief (paste or file — optional) |
| `.specs/project/requirements-brief.md` | Project-level elicitation output (when `/elicit` project ran) |
| `.specs/project/feature-briefs/[slug]/requirements-brief.md` | Feature-level elicitation (when `/elicit` feature ran) |
| `.specs/config.yaml` | Optional project context and per-phase rules |
| `.specs/domains/[domain]/spec.md` | Long-lived domain truth after Archive |
| `.specs/quick/NNN-slug/` | Quick-mode tasks and summaries |
| `.specs/features/[feature]/spec.md` | Requirements (use `NNN-slug` from `feature-init`) |
| `.specs/features/[feature]/context.md` | Owner decisions for gray areas (only when Discuss ran) |
| `.specs/features/[feature]/design.md` | Architecture (Complex tier) |
| `.specs/features/[feature]/exploration.md` | Solution exploration candidates + comparison (explicit mode) |
| `.specs/features/[feature]/tasks.md` | Atomic task breakdown |
| `.specs/features/[feature]/task-graph.md` | Job DAG and parallel groups (when applicable) |
| `.specs/features/[feature]/validation.md` | Independent verification report |
| `.specs/guardrails/scripts/` | Deterministic gate scripts |

**Create artifacts lazily.** Write a file only when its phase actually produces content. Never scaffold an empty `design.md`, `tasks.md`, or `context.md` — an empty file claims a phase ran when it did not. Absence is the correct state for a skipped phase.

Read `STATE.md` at session start; update it at session end. See `references/memory.md` and `git-handoff.md`.

## Loop Engineering & Harness

- **Correction Loop** — If the project harness fails, fix and retest up to 3 times before escalating to the owner.
- **Operational Harness** — Quality is enforced by test runners, linters, and compilers, never by AI self-declaration.
- **Fix → re-verify** — Gaps found in Verify become fix tasks; the loop is bounded to 3 iterations before escalating.

## Knowledge Verification Chain

Follow in strict order when making any technical decision:

1. **Codebase** — Conventions and patterns already in use
2. **Project docs** — README, `docs/`, `.specs/STATE.md` decisions
3. **MCP / Context** — Up-to-date library documentation via tools
4. **Web search** — Official docs and community patterns
5. **Uncertainty** — Say "I don't know" and flag it. Never invent APIs or behaviors.

Never skip to step 5 while steps 1–4 are available. Fabrication cascades through design, tasks, and implementation.

## Output Behavior

- **Do the work; do not narrate the machinery.** Produce the artifact instead of announcing the phase.
- **Match effort to the work.** Heavy reasoning for design and ambiguity; fast execution for mechanical tasks.
- **Write artifacts in a plain, decided voice.** Lead with the verdict; cut filler and hedging.
- **Artifacts in English** — code, tests, commits, and `.specs/` documents (see `engineering-standards.md`). Chat language is the owner's personal setting, not guardrails rule.

## Model Selection

- **Planning** (Specify, Discuss, Design, Tasks): high-reasoning models
- **Execution loop**: fast, cost-effective models
- **Verifier**: mid-to-high tier — it performs adversarial reasoning and designs mutants

## Sister Skills

| Skill | Layer |
| --- | --- |
| `task-graph-engineering.md` | Topology — task DAG, parallelism, diamond verify |
| `engineering-standards.md` | Quality — secure coding, one writer per file, artifact language |
| `security-review.md` | Verification — OWASP checklist for `/verify` |
| `appsec.md` | Conditional AppSec — threat sketch; Complex / attack surface only |
| `qa-strategy.md` | Conditional QA — smoke/regression; after AppSec if both apply |
| `code-simplify.md` | Conditional simplify — after A–D on Medium+ or owner ask; no behavior change |
| `ship-ready.md` | Conditional ship checklist — owner ask only; does not authorize push |
| `git-handoff.md` | Persistence — git sync, STATE template, session handoff |

Project rules: `.cursor/rules/engineering-baseline.mdc` (always applied in Cursor).

## Commands

| Command | Reference | Action |
| --- | --- | --- |
| `/explore` | `references/explore.md` | Think through ideas before Specify |
| `/elicit` | `references/elicitation.md` | Structured Q&A before Specify — project or feature scope |
| `/project-init` | `references/project-init.md` | Brownfield: map repo → PROJECT + domain stubs |
| `/constitution` | `references/constitution.md` | Create project governing principles |
| `/specify` | `references/specify.md` | `feature-init` then requirements; EARS; delta specs |
| `/discuss` | `references/discuss.md` | Resolve gray areas into `context.md` |
| `/plan` | `references/design.md` | Create technical design |
| `/tasks` | `references/tasks.md` | Atomic breakdown; coverage matrix (authoring) |
| `/analyze` | `references/analyze.md` | Cross-artifact consistency before task approval |
| `/task-graph` | `task-graph-engineering.md` | Draw or revise the job DAG |
| `/loop` | `references/implement.md` | Orchestrate Execute — `loop-plan`, parallel sub-agents, adequacy A–D |
| `/verify` | `references/validate.md` | Independent validation; lean UAT; conditional AppSec/QA |
| `/converge` | `references/converge.md` | Reassess drift; append remaining tasks |
| `/archive` | `references/archive.md` | Fold verified feature into domain truth |
| `/quick` | `references/quick-mode.md` | Express lane for ≤3-file changes (no feature branch) |
| `/handoff` | `references/memory.md` | Update STATE, commit `.specs/` (Tier 0; no push) |
| `/sync-spec` | `git-handoff.md` | Commit current feature artifacts only |
| `/lessons` | `references/lessons.md` | Record or load grounded lessons |

## Credits

Lineage and inspiration (CC-BY / MIT notices): see the repository [Credits](https://github.com/luizssantiago92/spec-guardrails#credits) — TLC Spec-Driven, Addy Osmani agent-skills, graph-engineering.
