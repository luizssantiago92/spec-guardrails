# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![CI](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml/badge.svg)](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Spec Guardrails — governed spec-driven development for AI coding agents](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/banner.svg)

**Governed spec-driven development for AI coding agents.**

More than a Spec Kit — a **repo-native governance harness** (specs, gates, memory, and human approvals) for AI coding agents.

Agents are fast — and optimistic. They ship code, summarize what they *think* they did, and move on. Spec Guardrails installs a **repeatable contract** into your repo: agree on the goal in writing, break work into provable steps, implement in waves, and verify with evidence that lives in **git**, not in a chat scrollback.

You keep control: the agent proposes; you approve specs and tasks; push, merge, and deploy stay on your terms.

| Without Spec Guardrails | With Spec Guardrails |
| --- | --- |
| Jumps to code and says “done” | Written goal first; “done” needs evidence |
| Each chat starts from zero | `.specs/` survives sessions and handoffs |
| Same ceremony for a typo and a payment flow | Complexity router matches depth to risk |
| Whole playbook pasted every turn | One skill per turn — lower cost, sharper focus |

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **5.0.x**

**Docs:** [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Full guide index](docs/guide/README.md)

[What it is](#what-it-is) · [Install](#1-install) · [Verify](#2-verify-readiness) · [First feature](#3-run-your-first-feature) · [Checklist](#getting-started-checklist) · [How it works](#how-it-works) · [Commands](#commands-cheat-sheet) · [Docs](#documentation) · [Credits](#credits)

---

## What it is

A **governance layer** for AI coding agents — not an IDE, not an autonomous agent, and not an MLOps platform. After install, agents work through written phases you approve:

**Requirements** → **Spec** → **Tasks** → **Execute** (waves + gates) → **Verify** (`file:line` evidence) → **Archive** into `.specs/` memory

You do not need to already know “spec-driven development.” The kit teaches the phases; you approve the artifacts. Failure modes and mechanisms: [three pillars](#three-pillars).

---

## 1. Install

Two commands — run both once in your project root:

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

| Command | What it does |
| --- | --- |
| **`install`** | Copies phase guides and sister skills into your agent tree, creates `.specs/`, installs Python gate scripts |
| **`doctor`** | Audits readiness — **Process** score (Node workflow) and **Brakes** score (Python gates available). Run after install and after every upgrade |

| Requirement | What you get |
| --- | --- |
| **Node.js 18+** | **Required** — CLI, skills, `.specs/` scaffold, full SDD workflow |
| **Python 3.10+** | **Optional** — enables **Brakes mode** (automatic gates below) |

Re-run `install` after package upgrades — your `.specs/` notes are preserved. Day to day you work in **agent chat**; the agent calls the CLI when a phase needs it.

### Optional presets

Seed team rules and stack hints in `.specs/config.yaml`:

```bash
npx @luizsantiago/spec-guardrails init-config --preset <name>
npx @luizsantiago/spec-guardrails preset list
```

| Preset | Typical use |
| --- | --- |
| `default` | General SDD |
| `node-ts` | Node / TypeScript projects |
| `python` | Python apps (`pytest`, `ruff`) |
| `python-platform` | Python + optional deploy/infra and/or AI paths per feature — [guide](docs/guide/python-platform.md) |

**Go deeper:** [Quick start](docs/guide/Quick-start.md) · [Platform parity](docs/guide/Platform-parity.md) · [Migration](docs/guide/Migration.md)

### Node alone vs Node + Python (gates)

**Node defines the process.** Every phase, every artifact, every approval — the full workflow runs on Node alone.

**Python can enforce the brakes.** With Python 3.10+, structural gates return **exit codes** — non-zero means STOP until the artifact is fixed.

| | **Process** (Node only) | **Brakes** (Node + Python) |
| --- | --- | --- |
| **Workflow** | Same SDD phases | Same SDD phases |
| **Who checks** | Agent reads the checklist in skills | Python scripts with **exit codes** |
| **When something is incomplete** | Agent *should* stop — relies on honesty | Agent **cannot** advance — non-zero = STOP |
| **Best for** | Learning the method, light teams | Teams that want proof between your approvals |

> Python turns “trust the agent” into “the agent has to prove it.”

`doctor` reports Process vs Brakes readiness. Gate taxonomy: [Gates and guarantees](#gates-and-guarantees) · [FAQ](docs/guide/FAQ.md#process-vs-brakes).

---

## 2. Verify readiness

Re-run `doctor` after upgrades or machine changes. You are ready when:

- Skills are present in your agent tree (for example `.cursor/skills/` in Cursor)
- `.specs/` exists with the memory scaffold
- Gate scripts are available when you want Brakes mode (Python 3.10+)
- Your AI coding agent can open the project and see the installed hub skill

For multi-agent installs, see [Multi-agent and platform support](#multi-agent-and-platform-support).

<details>
<summary>Working in this source repository (contributors)?</summary>

Do **not** use `npx @luizsantiago/spec-guardrails install` here — it can resolve incorrectly. Use:

```bash
npm install
npm run guardrails -- install
npm run guardrails -- doctor
npm test
```

</details>

---

## 3. Run your first feature

Open your AI coding agent in the project and ask for a concrete written goal, for example:

> Specify a small feature: users can sign in with email and password and get a session. Keep social login out of scope.

Ask it to follow the installed Spec Guardrails hub skill. Agent commands (`/specify`, `/loop`, `/verify`, …) are **chat phrases** — not shell commands.

| Step | You do | Agent does |
| --- | --- | --- |
| 1 | Approve the written goal (`spec.md`) | Runs specify + `validate-spec` when Brakes are on |
| 2 | Approve the task list (if not a quick fix) | Breaks work into owned jobs |
| 3 | Let it build one job at a time | `/loop` waves with gates and commits |
| 4 | Demand independent proof | Fresh-context `/verify` → `validation.md` |

If the agent jumps straight to code: *Stop. Finish the written goal and run the specify check first.*

**Go deeper:** [Quick start](docs/guide/Quick-start.md) · [Tutorials](docs/guide/tutorials/README.md) · [Agent commands](docs/guide/agent-commands.md)

---

## Getting started checklist

- [ ] Node.js 18+ is available (`node --version`)
- [ ] Ran `npx @luizsantiago/spec-guardrails install` in the project root
- [ ] `doctor` reports Process readiness (and Brakes if Python 3.10+ is installed)
- [ ] Opened the project in your AI coding agent and confirmed skills are visible
- [ ] Asked for a written goal and approved `spec.md` before implementation
- [ ] Know where docs live: [Quick start](docs/guide/Quick-start.md) · [Full guide](docs/guide/README.md)

Stuck? See [Quick start — If something feels stuck](docs/guide/Quick-start.md#if-something-feels-stuck) and the [FAQ](docs/guide/FAQ.md).

---

## Three pillars

| Problem | Pillar | One-line win |
| --- | --- | --- |
| Built the wrong feature | **Requirements analysis** | Agree on intent before `spec.md` |
| Skipped steps and called it done | **Gates (Brakes)** | Proof at boundaries, not trust |
| Every chat starts from zero | **Memory** | `.specs/` in git beats chat history |

### 1. Requirements analysis — stop building the wrong thing

**Without it:** “Add login” becomes three different products in three chats — OAuth vs magic link vs username/password — and you discover the mismatch halfway through a PR.

**With `/elicit`:** The agent asks a **small number of sharp questions** (at most five per round, one topic at a time, always with suggested options). It reads what you already wrote (`prd.md`, `docs/brief.md`, kickoff notes) and **does not re-ask** what those files already answer. You approve a **requirements brief** before `spec.md` exists — so vague chat does not harden into vague acceptance criteria.

| Without analysis | With analysis |
| --- | --- |
| Assumptions stay implicit in chat | Assumptions surface early with owners |
| Spec rewrites mid-build | Spec starts from an approved brief |
| “I thought you meant…” after code exists | Disagreement costs minutes, not days |

**Suggested, not mandatory** — clear requests can go straight to `/specify`. Optional `elicitation` policy (`require_brief`, `require_brief_complex`) can block `validate-spec` on Complex until a brief is approved.

**4.8+:** NFR section checks and `req-analysis diff` for brief↔spec drift — [workshop](docs/guide/tutorials/05-requirements-analysis-workshop.md).

**Go deeper:** [Requirements analysis](docs/guide/requirements-analysis.md) · [/elicit in agent commands](docs/guide/agent-commands.md)

---

### 2. Gates (Brakes) — “done” has to be provable

Scripts return non-zero = **STOP**; fix the artifact, re-run. Process vs Brakes (who enforces): [Install](#node-alone-vs-node--python-gates). Taxonomy: [Gates and guarantees](#gates-and-guarantees).

| Moment | What gates protect |
| --- | --- |
| **Before spec approval** | Criteria are testable (`SHALL`/`MUST`), assumptions documented |
| **Before task approval** | Every REQ maps to a task; tasks have shape and file ownership |
| **Each commit** | Conventional message, no empty staged diff, no linter/test bypass in the diff |
| **Before “feature done”** | Traceability REQ → task → `file:line` evidence; PASS verdict and `Verifier-Mode` in `validation.md` |
| **After verify FAIL** | Lessons are recorded — failures become rules, not forgotten |

Pipeline order: [gates reference](docs/guide/gates.md).

---

### 3. Memory — the repo remembers so you do not have to

**Without memory:** Every new session starts cold. You re-paste context, re-explain decisions, and hope the model does not contradict last week’s architecture chat.

**With `.specs/`:** `STATE.md` says where you left off. Each feature folder holds spec, tasks, design, and validation. **Archive** folds shipped work into **domain specs** and `ROADMAP.md`. Failed verifies become **lessons** that constrain the next run.

| Without `.specs/` | With `.specs/` |
| --- | --- |
| Chat is the source of truth | Git is the source of truth |
| Handoff = long message | Handoff = read `STATE.md` + feature folder |
| Same mistake twice | Lessons promote to confirmed rules |
| “What did we decide about timeouts?” | `memory-retrieve "session timeout"` (optional index) |

The **markdown artifacts alone** already beat chat-only workflows for any team that ships more than one feature. Optional search (keyword, graph, semantic embed) — see [Optional capabilities](#optional-capabilities-off-by-default).

**Go deeper:** [Memory guide](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md)

---

## How it works

High-level lifecycle — with **human approval** at the boundaries that matter:

```text
classify-change
      ↓
Requirements analysis? (/elicit) → approve brief?
      ↓
Specify (spec.md) → YOU approve spec
      ↓
Discuss / Design? (when needed)
      ↓
Tasks (tasks.md) → YOU approve tasks
      ↓
Execute (/loop waves) — gates + commits per task
      ↓
Verify (validation.md) — independent proof, author ≠ verifier
      ↓
Archive — fold into domain memory
```

**Quick lane:** ≤3 files, no new dependencies — skips full spec/tasks ceremony. See phase map below.

![Spec Guardrails phase flow — classify, optional elicitation, approvals, build loop, verify, archive](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/flow.svg)

---

## Spec-driven development (SDD)

The agent follows **written phases** instead of improvisation. **`classify-change`** picks Quick → Parallel so ceremony matches risk.

> More risk and complexity → more planning, design, evidence, and control.

### Phase map — what runs when

| Phase | Required? | What happens | You approve? |
| --- | --- | --- | --- |
| **Explore** | Optional | Research before a feature folder exists | — |
| **Elicit** | Optional | Structured Q&A → requirements brief ([pillar §1](#1-requirements-analysis--stop-building-the-wrong-thing)) | Brief |
| **Constitution** | Once per project | Project principles (`/constitution`) | Once |
| **Specify** | Yes (full path) | Written requirements | **Spec** |
| **Discuss** | When product is gray | Options A/B/C, decision records | As needed |
| **Design** | When architecture matters | Technical approach in `design.md`; `validate-design` when design exists on Complex/Medium+ | As needed |
| **Solution explore** | When architectures fork (optional — [off by default](#optional-capabilities-off-by-default)) | Compare candidates; record decision | Decision |
| **Tasks** | When work needs a job list | Atomic tasks, file ownership, REQ coverage | **Tasks** |
| **Execute** | Yes | `/loop` waves — implement, gate, commit; parallel when files are disjoint | — |
| **Verify** | Yes | **Independent proof** — fresh context writes `validation.md`; author ≠ verifier | Verdict |
| **Archive** | After Verify PASS | Fold into domain memory and roadmap | — |
| **Quick** | Alternative path | ≤3 files, express lane — skips full spec/tasks ceremony | — |
| **Converge** | On drift | Realign spec ↔ tasks before more Execute | — |

**Traceability:** REQ → task → evidence at verify ([pillar §2](#2-gates-brakes--done-has-to-be-provable)); semantic test quality is still your judgment.

![Complexity tiers — Quick, Simple, Medium, Complex, Parallel](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/tiers.svg)

**Go deeper:** [How it works](docs/guide/How-it-works.md) · [Agent commands](docs/guide/agent-commands.md) · [Concepts](docs/guide/concepts.md)

---

## Gates and guarantees

Exit code **0** = pass; **non-zero** = STOP. Scripts live under `.specs/guardrails/scripts/` after install.

### Gate layers (accurate taxonomy)

| Layer | What it is | Examples |
| --- | --- | --- |
| **Core structural gates (14)** | Python scripts with exit codes on artifacts | `validate-spec`, `validate-tasks`, `validate-state`, `validate-traceability`, `analyze-artifacts`, `check-commit`, `check-suppressions`, `validate-quick`, `lessons`, `quality-checks`, … |
| **Conditional gates** | Run when an artifact or path requires them | `validate-design` (when `design.md` exists), `validate-req-analysis` (when using `/elicit`), `req-analysis diff` (optional drift check) |
| **Platform gates** | Opt-in `python-platform` preset | `validate-ship-surface` when infra/AI paths appear in task Files |
| **Orchestration (aux)** | Planning and lookup — not artifact-shape gates | `loop-plan`, `memory-index`, `code-index` |

Also shipped: CI template (`templates/ci/guardrails-pr.yml`), opt-in `install-hooks` (`check-suppressions` + `check-commit --staged` on staged diffs).

**Go deeper:** [gates.md](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Gates and guarantees](docs/guide/Gates-and-guarantees.md)

---

## What is enforced — and what is not

Gates enforce **structure and evidence in `.specs/`** — not product taste, not semantic test quality, not a full AST review of implementation code.

| Enforced | Not enforced |
| --- | --- |
| Specification shape, REQ → task → proof traceability | Semantic test ↔ REQ alignment |
| Task/file ownership and graph hygiene | Stub code outside cited paths |
| Evidence citations and PASS verdict | Whether tests are clever or sufficient |
| Ship/AI fields when paths match (platform) | Rollback tested in prod, eval quality |
| Commit policy and suppression patterns | Coverage % as quality proxy |
| Commands under `quality.checks` (when configured) | Commands you never configured |

> A green gate means the required **process and evidence** exist — it is not proof that the product is perfect. `/verify` is phase discipline (not an exit-code guarantee by itself); optional capabilities stay off until configured.

**You** still approve specs and tasks. Approving a spec does **not** authorize push, PR, merge, or deploy — see [Human-in-the-loop](#human-in-the-loop-and-git-governance).

**Go deeper:** [FAQ](docs/guide/FAQ.md)

---

## Parallel work and loops

Two loop types — do not mix them in one session:

| Loop type | Purpose | Harness path |
| --- | --- | --- |
| **Feature loops** | Planned feature work with acceptance criteria | `feature-init` → SDD phases → `loop-plan` waves → `archive-feature` |
| **Operational loops (5.0+)** | Recurring repo health (triage, CI, deps) | `loop list` · `loop show` · `loop run` — [loop-patterns](docs/guide/loop-patterns.md) |

**Parallel feature execution** uses:

- **`task-graph.md`** — which tasks can run together
- **`loop-plan`** — next runnable wave
- **`workspace-prepare`** — git worktrees under `.specs/workspaces/`
- **File ownership** — parallel agents must not edit the same files without coordination

> Parallel agents should not blindly edit the same workspace.

**Go deeper:** [Loop patterns](docs/guide/loop-patterns.md) · [Tutorial 03 — Parallel worktrees](docs/guide/tutorials/03-parallel-worktrees.md)

---

## Human-in-the-loop and git governance

Structural gates enforce artifact quality. **Git tiers** enforce what leaves the machine.

| Tier | What happens automatically | What needs your go-ahead |
| --- | --- | --- |
| **0 — Local** | `feature-init`, local branch, commits for spec/tasks/code/`.specs/` | — |
| **1 — Share** | — | `git push`, open/update PR |
| **2 — External** | — | merge, deploy, force-push, production data |

- Approving a **spec** authorizes local work on that feature — not push or merge.
- Approving **tasks** authorizes Execute — not PR or deploy.
- The agent may commit locally (Tier 0); **you** decide when work is shared or shipped.

**Go deeper:** [Agent commands](docs/guide/agent-commands.md) · installed `git-handoff.md` skill

---

## Multi-agent and platform support

Spec Guardrails is a **repository-level governance method** adapted to different AI coding agents. The same kit installs into the skill tree your agent already reads:

| Platform | Install path |
| --- | --- |
| **Cursor** | `.cursor/skills/` |
| **Claude Code** | `.claude/skills/` |
| **GitHub Copilot** | `.github/skills/` |
| **OpenAI Codex** | `.codex/skills/` |
| **Other agents** | Root `AGENTS.md` (open standard) |

By default `install` detects one platform and writes **one** tree. Use `install --all-platforms` for every supported tree (existing trees are preserved when you switch IDEs).

**Go deeper:** [Platform parity](docs/guide/Platform-parity.md)

---

### Hub and skills — how the agent navigates

The **hub** (`agent-architecture.md`) is the map loaded every turn: contract, **complexity router**, gate schedule, phase order, and git tiers. It tells the agent *which* procedure to open next — not the whole playbook at once.

**Phase guides** (`references/`) load **one per turn** (`specify.md`, `tasks.md`, `implement.md`, `validate.md`, …) — roughly **70% fewer skill tokens** than dumping the full kit each message.

**Sister skills** load only when the work needs extra depth (security, task graphs, platform infra/AI, …). The hub loads **at most one** conditional sister at a time for Verify extras (AppSec, then QA).

Optional **shell I/O** savings (compact `git`/test output) come from adjacent tools like [RTK](https://github.com/rtk-ai/rtk) — not bundled; see [Token efficiency](docs/guide/Token-efficiency.md).

Full catalog: hub, nineteen phase guides, ten sister skills.

**Go deeper:** [Skills and hub](docs/guide/skills-and-hub.md) · [Token efficiency](docs/guide/Token-efficiency.md)

---

## Brownfield projects

Existing repositories do not start from zero. **`project-init`** maps the codebase into `.specs/`:

- **`PROJECT.md`** — stack, roots, conventions
- **Domain stubs** — optional `.specs/domains/`
- **`code-index rebuild`** — shallow symbol map (runs by default since **5.0**; skip with `--no-code-index`)
- **Preset suggestion** — may recommend `python-platform` when infra/AI paths are detected

For large mixed corpora, optional external tools like [Graphify](https://github.com/Graphify-Labs/graphify) can add a navigable wiki/graph — **not** part of this package; see [Brownfield context](docs/guide/brownfield-context.md).

The agent reads project memory instead of rediscovering structure every session.

**Go deeper:** [Brownfield context](docs/guide/brownfield-context.md) · `/project-init` in [agent commands](docs/guide/agent-commands.md)

---

## Python Platform (optional — 4.7+)

**What it is:** an optional **preset and gate pack** for **Python repos** where **some features** also touch **deploy/infra** and/or **AI/LLM** code paths. You do **not** need backend + DevOps + AI on every change — surfaces activate **per feature** when task files match:

| Your feature touches… | What gets documented in `design.md` |
| --- | --- |
| Docker, Compose, Terraform, Helm, CI workflows | **Ship Surface** (deploy unit, CI, rollback) |
| `prompts/`, `evals/`, MCP, RAG, embeddings | **AI Surface** (eval harness, fallback, scope) |
| Application Python only | Standard SDD — extra surfaces only when paths match |

```bash
npx @luizsantiago/spec-guardrails init-config --preset python-platform
```

**With the preset:** gate `validate-ship-surface` blocks verify when matching paths lack documented surfaces; sisters `python-devops` and `ai-engineering` guide authoring; `feature-overview` adds operational + AI traceability tables.

### What Python Platform is **not** (honest)

| It is **not** | What we do instead |
| --- | --- |
| LangSmith, Coze Loop, live production traces | Version **contracts** in git + `/verify` evidence |
| MLOps / eval runtime | Require a **documented** harness — quality is yours |
| `terraform plan` security or cost review | Structural checks when you configure them |
| Separate FastAPI/Django presets | Framework patterns in **tutorial appendices** |

Repos without `python-platform` are unchanged.

**Go deeper:** [Python platform guide](docs/guide/python-platform.md) · [Tutorial 04](docs/guide/tutorials/04-python-platform-ship-surface.md)

---

## Optional capabilities (off by default)

Advanced enforcement exists without making every project pay the same complexity cost:

| Capability | What it adds | Turn on when |
| --- | --- | --- |
| **Semantic memory** | Meaning-based search across archived specs (`memory-index embed`) | Many archived features; keyword search is not enough |
| **`execution-policy`** | Path allow/deny, retry and run budgets in `.specs/config.yaml` | Agent has broad shell or file access |
| **`context-guard`** | Block edits outside approved task `Files` | You want scope enforcement before edits |
| **`sandbox check-command`** | Warn or block destructive shell (`rm -rf`, force-push, …) | Agent runs terminal commands unsupervised |
| **`episodes`** | Short-lived session notes (`episodes record`) | Very long sessions; prune when done |
| **`solution-explore`** | Formal architecture fork with `exploration.md` | Two+ defensible designs for the same spec |

**Go deeper:** [Agent commands](docs/guide/agent-commands.md) · [Architecture](docs/guide/Architecture.md)

---

## Commands cheat sheet

Run from your project root (where you ran `install`). Prefer `npx @luizsantiago/spec-guardrails <command>` unless the CLI is on your `PATH`.

Inspect feature governance state with `feature-status` / `feature-overview`. Hands-on paths: [Tutorials](docs/guide/tutorials/README.md).

| Command | What it does |
| --- | --- |
| `install` | Install skills, `.specs/`, and gate scripts |
| `doctor` | Audit Process / Brakes readiness |
| `init-config --preset <name>` | Seed `.specs/config.yaml` |
| `preset list` | List built-in presets |
| `project-init` | Map a brownfield repo into `.specs/` |
| `feature-init "<description>"` | Allocate feature folder, STATE, local branch |
| `classify-change <desc>` | Heuristic complexity tier |
| `feature-status [feature]` | Artifact checklist + next step |
| `feature-overview [feature]` | REQ → task → evidence dashboard |
| `feature-pr-body [feature]` | PR description from traceability |
| `phase-context <phase>` | Inject team rules from `config.yaml` |
| `validate-spec [feature]` | Spec shape gate |
| `validate-tasks [feature]` | Task granularity / ownership gate |
| `install-hooks` | Opt-in pre-commit (commit + suppressions) |
| `loop list` / `loop show` / `loop run` | Operational loops (5.0+) |
| `archive-feature [feature]` | Fold verified work into domain memory |

Everyday gate examples after install:

```bash
npx @luizsantiago/spec-guardrails validate-spec auth
npx @luizsantiago/spec-guardrails check-commit --message "feat(auth): add token refresh"
npx @luizsantiago/spec-guardrails lessons list --status confirmed
```

Full CLI surface: run `npx @luizsantiago/spec-guardrails` with no args. Agent chat phrases: [Agent commands](docs/guide/agent-commands.md).

---

## Explore the repository

| Path | What you find |
| --- | --- |
| [`index.js`](index.js) / [`lib/`](lib/) | Node CLI entry and command implementations |
| [`skills/`](skills/) | Hub, phase guides, and sister skills installed into agent trees |
| [`scripts/`](scripts/) | Python structural gates (Brakes mode) |
| [`templates/`](templates/) | Spec/task scaffolds, CI template, config presets |
| [`rules/`](rules/) | Engineering baseline and related rules |
| [`docs/guide/`](docs/guide/) | Product guide — start at [Quick start](docs/guide/Quick-start.md) |
| [`docs/guide/tutorials/`](docs/guide/tutorials/) | Hands-on paths from quick fix to parallel work |
| [`.assets/`](.assets/) | README diagrams (banner, flow, tiers) |

After install in a consumer project, day-to-day artifacts live under **`.specs/`** (`STATE.md`, feature folders, domain memory, and gate scripts).

---

## Documentation

| Area | Guides |
| --- | --- |
| **Start** | [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Tutorials](docs/guide/tutorials/README.md) · [Agent commands](docs/guide/agent-commands.md) |
| **Core** | [How it works](docs/guide/How-it-works.md) · [Concepts](docs/guide/concepts.md) · [Requirements analysis](docs/guide/requirements-analysis.md) · [Memory](docs/guide/Memory.md) |
| **Enforcement** | [Gates](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Gates and guarantees](docs/guide/Gates-and-guarantees.md) |
| **Platform** | [Architecture](docs/guide/Architecture.md) · [Platform parity](docs/guide/Platform-parity.md) · [Skills and hub](docs/guide/skills-and-hub.md) · [Loop patterns](docs/guide/loop-patterns.md) |
| **Advanced** | [Python platform](docs/guide/python-platform.md) · [Brownfield](docs/guide/brownfield-context.md) · [Token efficiency](docs/guide/Token-efficiency.md) · [Ecosystem](docs/guide/ecosystem.md) · [Migration](docs/guide/Migration.md) · [Product history](docs/guide/Product-history.md) · [Stability](docs/guide/Stability-policy.md) · [CHANGELOG](docs/CHANGELOG.md) · [FAQ](docs/guide/FAQ.md) · [Glossary](docs/guide/Glossary.md) · [Governance audit](docs/architecture-and-governance-audit.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## Contributing

Focused improvements are welcome — [CONTRIBUTING.md](CONTRIBUTING.md). Sources: `skills/`, `lib/`, `scripts/`, `rules/`. Run `npm test` before every PR.

---

## Credits

Patterns adapted from open source. **Shipped influences** (skills, gates, or layout consumers install):

| Source | License | What we extracted |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | CC-BY-4.0 | Spec → tasks → execute → verify phases; `.specs/features/`, `STATE.md`; gate “brakes” philosophy |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Discuss-phase options A/B/C; definition-of-done in verify/archive |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | Task-graph rules; `validate-tasks` graph hygiene |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | Execute wave model; operational vs feature loops in [loop-patterns.md](docs/guide/loop-patterns.md); **`loop list|show|run` CLI** (5.0+) |
| [Addy Osmani — Loop engineering](https://addyosmani.com/blog/loop-engineering/) | Essay | Loop taxonomy in loop-patterns guide |
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | CC0 | Harness vs app vocabulary in [ecosystem.md](docs/guide/ecosystem.md) |
| [loopgate_harness](https://github.com/rxdt/loopgate_harness) | MIT | `check-suppressions`; `quality.checks` as verify evidence; `check-commit --staged`; honest-limits framing; README diagram approach |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Two-stage subagent review in `sub-agents.md` |

**Original work here:** Node CLI, Python gates, platform adapters, elicitation (`/elicit`), Python Platform pack (4.7+), SDLC integration helpers (4.8+), operational loops CLI (5.0+), memory-index, execution policy, req-analysis tooling.

**Cited, not vendored:** [DeepCode](https://github.com/HKUDS/DeepCode), [RepoGraph](https://github.com/ozyyshr/RepoGraph), [Graphify](https://github.com/Graphify-Labs/graphify), [RTK](https://github.com/rtk-ai/rtk), [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) — see [credits.md](docs/guide/credits.md).

---

## License

MIT — see [LICENSE](LICENSE).

[↑ Back to top](#spec-guardrails)
