# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![CI](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml/badge.svg)](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Spec Guardrails — governed spec-driven development for AI coding agents](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/banner.svg)

**Governed spec-driven development for AI coding agents.**

Agents write code fast and call “done” too early. Spec Guardrails installs a **repeatable method** into your repository: write the goal, get your approval, build in small waves, prove each step, and verify with fresh eyes. Plans, decisions, and evidence live as **files in git** (`.specs/`) — not only in chat.

You stay in charge: the agent proposes; you approve specs and tasks; push and merge stay on your terms.

| Without it | With Spec Guardrails |
| --- | --- |
| Jumps to code and says “done” | Requirements first; “done” needs evidence |
| Each chat starts from zero | State and specs survive the session |
| Same ceremony for a typo and a payment flow | Complexity router picks the right depth |
| Whole playbook pasted every turn | One skill loaded per turn — lower cost, sharper focus |

Works with **Cursor, Claude Code, Copilot, Codex**, and other agents.

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.7.x**

**Docs:** [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Full guide index](docs/guide/README.md)

---

## Install

Run once in your project root:

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

`install` copies phase guides for your agent, creates `.specs/`, and detects your IDE (Cursor, Claude, Copilot, or Codex) — one skill tree by default. Re-run after upgrades; your notes are preserved.

| Requirement | Role |
| --- | --- |
| **Node.js 18+** | **Required** — CLI, install, and the full SDD workflow |
| **Python 3.10+** | **Optional** — enables **Brakes mode** (automatic gates) |

### Node alone vs Node + Python

**Node is enough for the full process** — every phase, every artifact, every approval. The agent follows the same hub and phase guides.

**Python adds Brakes:** small scripts run at phase boundaries and **block** the agent when paperwork is incomplete — thin spec, missing task coverage, broken traceability, “done” without test evidence, sloppy commits, or bypass patterns in the diff. Without Python, the agent still has the same checklist in skills (Process mode); with Python, skipping steps fails loudly instead of relying on honesty.

**When gates run:** before you approve a spec or task list, between execute waves (commits), and before a feature is declared finished. **What you gain:** predictable quality at boundaries, less rework, and proof you can audit in git — not a vibe in chat.

**12 gates** cover planning, building, and closing (including `validate-ship-surface` for python-platform teams). Full command list, pipeline order, and freeze policy live in the docs — not duplicated here.

**Go deeper:** [Gates reference](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Process vs Brakes (FAQ)](docs/guide/FAQ.md#process-vs-brakes) · [Quick start](docs/guide/Quick-start.md)

---

## Spec-driven development (SDD)

Spec Guardrails is a **spec-driven development** kit: the agent follows written phases instead of improvising. The model comes from open SDD practice ([tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven)) and is extended with enforcement ideas from agent harness work ([loopgate_harness](https://github.com/rxdt/loopgate_harness)).

### Lineage in this product

| Idea | Source | How it shows up here |
| --- | --- | --- |
| **SDD loop** | tlc-spec-driven | Specify → Tasks → Execute → Verify → Archive |
| **Wave execution** | [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | `/loop` — small batches, test, commit, repeat |
| **Safe parallelism** | [graph-engineering](https://github.com/codejunkie99/graph-engineering) | `task-graph.md`, disjoint file ownership, merge owner |
| **Harness enforcement** | loopgate_harness | Suppression blocking, config-driven quality checks at verify |

You get a **repo-native harness**: skills + `.specs/` memory + optional Python gates — not a separate runtime or desktop app.

### Hub, skills, and context discipline

The **hub** (`agent-architecture.md`) is the map: contract, phase order, when to run gates, and a **complexity router** (Quick → Parallel). Before work starts, the agent classifies the change — a label fix does not get a task graph; a payments integration does not skip review.

![Complexity tiers — Quick, Simple, Medium, Complex, Parallel](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/tiers.svg)

**Skills load one at a time** — hub → one phase guide → optional sister skill. Dumping the entire library every turn wastes context and money; progressive loading keeps sessions affordable. Sisters (security, QA, task-graph, platform infra/AI, …) load only when the work needs them.

**Go deeper:** [Skills and hub](docs/guide/skills-and-hub.md) · [Token efficiency](docs/guide/Token-efficiency.md) · [Concepts](docs/guide/concepts.md)

### Artifacts and feature flow

Everything important is markdown under `.specs/` — reviewable like code.

![Spec Guardrails phase flow — classify, optional elicitation, approvals, build loop, verify, archive](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/flow.svg)

| Stage | What happens |
| --- | --- |
| **Explore / Elicit** (optional) | Research or structured Q&A when the request is still fuzzy |
| **Specify** | Written requirements (`spec.md`) — you approve |
| **Discuss / Design** (when needed) | Product gray areas and technical approach (`design.md`) |
| **Tasks** | Atomic jobs with file ownership (`tasks.md`) — you approve |
| **Execute** | Waves via `/loop` — implement, gate, commit |
| **Verify** | Independent proof (`validation.md`) in fresh context when possible |
| **Archive** | Fold into domain memory and roadmap |

**Requirements analysis** (`/elicit`) fits early in this flow: a few targeted questions per round (with suggested options), grounded in files you already have (`prd.md`, briefs). You approve a requirements brief before Specify — so vague chat does not become vague specs. It is **suggested**, not forced, when the brief is already clear.

**Sub-agents** scale Execute when the task graph has many parallel-safe jobs: batched dispatch, disjoint files, one merge owner — see the hub protocol, not ad-hoc parallel chaos.

**Go deeper:** [How it works](docs/guide/How-it-works.md) · [Agent commands](docs/guide/agent-commands.md) · [Requirements analysis](docs/guide/requirements-analysis.md) · [Loop patterns](docs/guide/loop-patterns.md) · [Architecture](docs/guide/Architecture.md) · [Ecosystem map](docs/guide/ecosystem.md)

---

## Memory

**Memory = `.specs/` in git.** `STATE.md` holds the active feature and the single next step. Each feature folder keeps spec, tasks, design, and validation. After archive, domain specs and `ROADMAP.md` accumulate team knowledge. Failed verifies become **lessons** that constrain the next run.

**Why it helps:** a new chat, a new teammate, or next week’s you can read the repo instead of re-explaining. Chat is ephemeral; `.specs/` is the source of truth.

**Search (optional):** CLI helpers rebuild an index from those files — keyword search, graph expansion, and optional semantic retrieval — so you can ask “what did we decide about session timeout?” without opening every markdown file by hand.

**Go deeper:** [Memory guide](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md) · [project-init](docs/guide/agent-commands.md)

---

## Python Platform (optional — 4.7+)

For teams shipping **Python backend + DevOps + AI** from one repository — Compose, CI, Terraform, Helm, plus LLM/RAG/MCP/eval paths.

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails init-config --preset python-platform
```

The `python-platform` preset extends `python` with Ship Surface and AI Surface sections in `design.md` (deploy, CI, rollback, eval harness, fallback). When task files touch infra or AI paths, gate `validate-ship-surface` blocks verify until those surfaces are documented. Sister skills `python-devops` and `ai-engineering` load on demand.

### What Python Platform is **not** (honest)

| It is **not** | What we do instead |
| --- | --- |
| LangSmith, Coze Loop, or live production LLM tracing | Version **contracts** in git + `/verify` evidence |
| An MLOps or eval runtime | Require a **documented** eval harness — quality is your team’s job |
| Terraform plan / security review or cost analysis | Structural checks (`terraform validate`, `helm template`) when you configure them |
| Framework-specific presets (FastAPI vs Django) | Framework patterns in **tutorial appendices**, one agnostic preset |

Repos that do not opt into `python-platform` are unchanged.

**Go deeper:** [Python platform guide](docs/guide/python-platform.md) · [Tutorial 04](docs/guide/tutorials/04-python-platform-ship-surface.md) · [Product history — version pinning](docs/guide/Product-history.md)

---

## Limitations

Spec Guardrails governs **structure and evidence in `.specs/`** — not product taste, not semantic test quality, and not a full review of your implementation AST.

| Enforced | Not enforced |
| --- | --- |
| Spec shape, REQ → task → proof traceability | Whether a cited test line actually asserts the criterion |
| Evidence citations and PASS verdict in `validation.md` | Stub or broken code outside cited paths |
| Commit policy and suppression patterns in diff | Coverage % as a proxy for good tests |
| Commands you list under `quality.checks` | Commands you never configured |

A green gate means the paperwork looks complete — you still approve specs and tasks.

**Go deeper:** [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Gates and guarantees](docs/guide/Gates-and-guarantees.md) · [FAQ](docs/guide/FAQ.md)

---

## Contributing

Focused improvements are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for layout, gate stability rules, and local checks.

Package sources live under `skills/`, `lib/`, `scripts/`, and `rules/`. Re-run `npm run guardrails -- install` after changing shipped assets; run `npm test` before every PR.

---

## Credits

Spec Guardrails adapts patterns from open-source work:

| Project | License | Used for |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | CC-BY-4.0 | Spec → tasks → execute → verify, `.specs/` layout, gate philosophy |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Design-discussion patterns, definition-of-done framing |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | Task-graph rules for safe parallel waves |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | Wave-based execution model |
| [loopgate_harness](https://github.com/rxdt/loopgate_harness) | MIT | Suppression blocking, quality commands as verify evidence, honest-limits framing, README diagram layout |

Everything else — CLI, Python gates, platform adapters, requirements analysis, and the Python Platform pack (4.7+) — is original work here. Full lineage: [Credits and lineage](docs/guide/credits.md).

---

## Documentation

| Topic | Start here |
| --- | --- |
| Orientation | [Overview](docs/guide/Overview.md) |
| First session | [Quick start](docs/guide/Quick-start.md) |
| Chat commands | [Agent commands](docs/guide/agent-commands.md) |
| Process story | [How it works](docs/guide/How-it-works.md) |
| Gates (technical) | [gates.md](docs/guide/gates.md) |
| Product promises | [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| Python platform | [python-platform.md](docs/guide/python-platform.md) |
| Tutorials | [tutorials/README.md](docs/guide/tutorials/README.md) |
| Version history | [CHANGELOG](docs/CHANGELOG.md) · [Product history](docs/guide/Product-history.md) |
| Questions | [FAQ](docs/guide/FAQ.md) · [Glossary](docs/guide/Glossary.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## License

MIT — see [LICENSE](LICENSE).
