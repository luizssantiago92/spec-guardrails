# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![CI](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml/badge.svg)](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Spec Guardrails — governed spec-driven development for AI coding agents](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/banner.svg)

**Governed spec-driven development for AI coding agents.**

Agents are fast — and optimistic. They ship code, summarize what they *think* they did, and move on. Spec Guardrails installs a **repeatable contract** into your repo: agree on the goal in writing, break work into provable steps, implement in waves, and verify with evidence that lives in **git**, not in a chat scrollback.

You keep control: the agent proposes; you approve specs and tasks; push, merge, and deploy stay on your terms.

| Without Spec Guardrails | With Spec Guardrails |
| --- | --- |
| Jumps to code and says “done” | Written goal first; “done” needs evidence |
| Each chat starts from zero | `.specs/` survives sessions and handoffs |
| Same ceremony for a typo and a payment flow | Complexity router matches depth to risk |
| Whole playbook pasted every turn | One skill per turn — lower cost, sharper focus |

**Platform adapters.** The same kit installs into the skill tree your agent already reads — **Cursor** (`.cursor/skills/`), **Claude Code** (`.claude/skills/`), **GitHub Copilot** (`.github/skills/`), **OpenAI Codex** (`.codex/skills/`), plus root `AGENTS.md` for other tools. By default `install` detects one platform and writes **one** tree; use `--all-platforms` when the repo serves multiple agents. Existing trees are preserved when you switch IDEs.

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **5.0.x**

**Docs:** [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Full guide index](docs/guide/README.md)

---

## Install

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

**Node is enough for the full process** — every phase, every artifact, every approval. The agent follows the same hub and phase guides.

The difference is who decides whether a step is really finished:

| | **Process** (Node only) | **Brakes** (Node + Python) |
| --- | --- | --- |
| **Workflow** | Same SDD phases | Same SDD phases |
| **Who checks** | Agent reads the checklist in skills | Python scripts with **exit codes** |
| **When something is incomplete** | Agent *should* stop — relies on honesty | Agent **cannot** advance — non-zero = STOP |
| **Best for** | Learning the method, light teams | Teams that want proof between your approvals |

Add Python when you want those checklists enforced by **exit codes** instead of agent honesty — [what gates check at each boundary](#2-gates-brakes--done-has-to-be-provable). `doctor` reports Process vs Brakes readiness after install and upgrades.

**Go deeper:** [Gates reference](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Process vs Brakes (FAQ)](docs/guide/FAQ.md#process-vs-brakes)

---

## Why teams adopt it — three pillars

Most agent failures are not “bad code in one file.” They are **wrong goal**, **lost context**, or **fake done**. Spec Guardrails attacks those three problems directly.

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

It is **suggested**, not mandatory — clear requests can go straight to `/specify`. The win is catching ambiguity **before** the agent treats a half-sentence as a contract.

**4.8+:** optional `elicitation` policy (`require_brief` on Complex), NFR section checks, and `req-analysis diff` for brief↔spec drift — [workshop](docs/guide/tutorials/05-requirements-analysis-workshop.md).

**Go deeper:** [Requirements analysis](docs/guide/requirements-analysis.md) · [/elicit in agent commands](docs/guide/agent-commands.md)

---

### 2. Gates (Brakes) — “done” has to be provable

**Process vs Brakes** — who enforces the checklist — is in [Install](#node-alone-vs-node--python-gates). Here is *when* Brakes run: scripts return non-zero = **STOP**; fix the artifact, re-run.

| Moment | What gates protect |
| --- | --- |
| **Before spec approval** | Criteria are testable (`SHALL`/`MUST`), assumptions documented |
| **Before task approval** | Every REQ maps to a task; tasks have shape and file ownership |
| **Each commit** | Conventional message, no empty staged diff, no linter/test bypass in the diff |
| **Before “feature done”** | Traceability REQ → task → `file:line` evidence; PASS verdict and `Verifier-Mode` in `validation.md` |
| **After verify FAIL** | Lessons are recorded — failures become rules, not forgotten |

Fifteen+ gates cover planning through close — including `validate-design` (Complex), optional [Python Platform](#python-platform-optional--47) checks, CI template (`templates/ci/guardrails-pr.yml`), and opt-in `install-hooks` for pre-commit. Command list and pipeline order: [gates reference](docs/guide/gates.md).

---

### 3. Memory — the repo remembers so you do not have to

**Without memory:** Every new session starts cold. You re-paste context, re-explain decisions, and hope the model does not contradict last week’s architecture chat.

**With `.specs/`:** `STATE.md` says where you left off. Each feature folder holds spec, tasks, design, and validation. Archive folds shipped work into **domain specs** and `ROADMAP.md`. Failed verifies become **lessons** that constrain the next run.

| Without `.specs/` | With `.specs/` |
| --- | --- |
| Chat is the source of truth | Git is the source of truth |
| Handoff = long message | Handoff = read `STATE.md` + feature folder |
| Same mistake twice | Lessons promote to confirmed rules |
| “What did we decide about timeouts?” | `memory-retrieve "session timeout"` (optional index) |

The **markdown artifacts alone** already beat chat-only workflows for any team that ships more than one feature. Optional search (keyword, graph, semantic embed) — see [Optional capabilities](#optional-capabilities-off-by-default).

**Go deeper:** [Memory guide](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md) · [Loop patterns](docs/guide/loop-patterns.md) (operational loops, 5.0+)

---

## Spec-driven development (SDD)

Under the three pillars sits the **spec-driven method** the agent follows: written phases instead of improvisation. Before work starts, **`classify-change`** picks a complexity tier (Quick → Parallel) so a typo does not get a task graph and a payment flow does not skip review.

Lineage: [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven), [loop-engineering](https://github.com/cobusgreyling/loop-engineering), [graph-engineering](https://github.com/codejunkie99/graph-engineering), [loopgate_harness](https://github.com/rxdt/loopgate_harness). **Repo-native harness** — not another desktop runtime.

![Spec Guardrails phase flow — classify, optional elicitation, approvals, build loop, verify, archive](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/flow.svg)

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

**Brownfield:** `project-init` maps an existing repo into `.specs/` (`PROJECT.md`, domains, suggested preset) so the agent is not guessing stack every session.

**Traceability:** REQ → task → evidence at verify ([pillar §2](#2-gates-brakes--done-has-to-be-provable)); semantic test quality is still your judgment.

**Parallel work:** `loop-plan` picks the next wave; `task-graph.md` and git worktrees (`workspace-prepare`) keep parallel agents off the same files.

**Operational loops (5.0+):** recurring repo work (triage, CI, deps) uses `loop list` / `loop run` — separate from feature `loop-plan`. See [loop-patterns](docs/guide/loop-patterns.md).

**Git tiers:** approving spec/tasks authorizes **local work only** (Tier 0). Push, PR, merge, and deploy need your explicit go-ahead — see [git-handoff](docs/guide/agent-commands.md).

![Complexity tiers — Quick, Simple, Medium, Complex, Parallel](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/tiers.svg)

**Go deeper:** [How it works](docs/guide/How-it-works.md) · [Loop patterns](docs/guide/loop-patterns.md) · [Agent commands](docs/guide/agent-commands.md) · [Concepts](docs/guide/concepts.md)

### Hub and skills — how the agent navigates

The **hub** (`agent-architecture.md`) is the map loaded every turn: contract, **complexity router**, gate schedule, phase order, and git tiers. It tells the agent *which* procedure to open next — not the whole playbook at once.

**Phase guides** (`references/`) load **one per turn** (`specify.md`, `tasks.md`, `implement.md`, `validate.md`, …) — roughly **70% fewer skill tokens** than dumping the full kit each message.

**Sister skills** load only when the work needs extra depth (security, task graphs, platform infra/AI, …). The hub loads **at most one** conditional sister at a time for Verify extras (AppSec, then QA).

For **what each skill does and when to load it**, see the full catalog — hub, nineteen phase guides, ten sister skills:

**Go deeper:** [Skills and hub](docs/guide/skills-and-hub.md) · [Token efficiency](docs/guide/Token-efficiency.md)

---

## Python Platform (optional — 4.7+)

**What it is:** an optional **preset and gate pack** for **Python repos** where **some features** also touch **deploy/infra** and/or **AI/LLM** code paths. You do **not** need backend + DevOps + AI on every change — surfaces activate **per feature** when task files match:

| Your feature touches… | What gets documented in `design.md` |
| --- | --- |
| Docker, Compose, Terraform, Helm, CI workflows | **Ship Surface** (deploy unit, CI, rollback) |
| `prompts/`, `evals/`, MCP, RAG, embeddings | **AI Surface** (eval harness, fallback, scope) |
| Application Python only | Standard SDD — extra surfaces only when paths match |

`project-init` may suggest this preset when it detects compose, Terraform, CI, or eval directories — you still opt in.

```bash
npx @luizsantiago/spec-guardrails init-config --preset python-platform
```

**Without the preset:** deploy steps live in someone’s head, eval harnesses are “later,” rollback is learned during an incident.

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

These ship in the package but stay **disabled or unused until you configure them** — extra guardrails and power tools, not part of the default SDD path.

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

## More in the kit

| Capability | Role |
| --- | --- |
| **`feature-status` / `feature-overview`** | Human-readable checklist and REQ → task → evidence dashboard |
| **`phase-context`** | Inject team rules from `config.yaml` at a given phase |
| **Tutorials** | Hands-on paths: quick fix → medium feature → parallel → python platform — [index](docs/guide/tutorials/README.md) |

**Go deeper:** [Tutorials](docs/guide/tutorials/README.md) · [Ecosystem map](docs/guide/ecosystem.md)

---

## Limitations

Gates enforce **structure and evidence in `.specs/`** — not product taste, not semantic test quality, not a full AST review of implementation code.

| Enforced | Not enforced |
| --- | --- |
| Spec shape, REQ → task → proof traceability | Semantic test ↔ REQ alignment |
| Evidence citations and PASS verdict | Stub code outside cited paths |
| Ship/AI fields when paths match (platform) | Rollback tested in prod, eval quality |
| Commit policy and suppression patterns | Coverage % as quality proxy |
| Commands under `quality.checks` | Commands you never configured |

A green gate means the paperwork looks complete — **you** still approve specs and tasks.

**Go deeper:** [Gates and guarantees](docs/guide/Gates-and-guarantees.md) · [FAQ](docs/guide/FAQ.md)

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

**Cited, not vendored:** [DeepCode](https://github.com/HKUDS/DeepCode), [RepoGraph](https://github.com/ozyyshr/RepoGraph), [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) — see [credits.md](docs/guide/credits.md).

---

## Documentation

| Topic | Link |
| --- | --- |
| Start here | [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Tutorials](docs/guide/tutorials/README.md) |
| Chat & CLI | [Agent commands](docs/guide/agent-commands.md) |
| Process | [How it works](docs/guide/How-it-works.md) · [Concepts](docs/guide/concepts.md) |
| Skills (each role) | [Skills and hub](docs/guide/skills-and-hub.md) |
| Gates | [gates.md](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| Requirements | [requirements-analysis.md](docs/guide/requirements-analysis.md) |
| Memory | [Memory.md](docs/guide/Memory.md) |
| Python platform | [python-platform.md](docs/guide/python-platform.md) |
| Versions | [CHANGELOG](docs/CHANGELOG.md) · [Product history](docs/guide/Product-history.md) |
| Help | [FAQ](docs/guide/FAQ.md) · [Glossary](docs/guide/Glossary.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## License

MIT — see [LICENSE](LICENSE).
