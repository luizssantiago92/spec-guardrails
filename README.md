# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Keep AI coding agents honest — specify the work, prove each step, verify independently.**

| | |
| --- | --- |
| **Problem** | Agents ship “looks good” with thin specs, missing evidence, and the same context that wrote the code declaring victory. |
| **Solution** | One kit, two deliberate modes: **Process** (Node only) for a flexible spec-driven workflow; **Brakes** (Node + Python) for the **full product** — structural gates that exit non-zero when paperwork or evidence is missing. You approve specs/tasks in both. |
| **Result** | Traceable `.specs/` memory, fewer fake finishes, cheaper turns (~70% less skill text on planning). Choose Process for light ceremony; add Python when you want the [Guarantees matrix](#guarantees-matrix) enforced automatically. |

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **3.2.x**

---

## Install

```bash
npx @luizsantiago/spec-guardrails install
```

### What you need

| Requirement | Role |
| --- | --- |
| **Node.js 18+** | Required — runs the CLI and `install` |
| **Python 3.10+** | Activates **Brakes mode** — the **full** kit with Python structural gates (`validate-spec`, `validate-tasks`, …). Gates stay Python by design. Without Python you stay in **Process mode**: same phases and checklists, no exit-code enforcement. Run [`doctor`](#install) to see which mode you are in |

### What install does

| Lands in your project | Purpose |
| --- | --- |
| `.cursor/skills/` + `.claude/skills/` + `.github/skills/` + `.codex/skills/` | Hub, phase references, sister skills (**shipped adapters** — same content, product-specific paths) |
| `.specs/guardrails/scripts/` | Python gate scripts (Brakes mode) |
| `.specs/STATE.md`, `.specs/features/`, … | Project memory (any agent) |
| `.cursor/rules/engineering-baseline.mdc` | Always-on Cursor rule |

**Agent environments:** the **core** (`.specs/`, CLI, hub, Python gates) works with any AI agent. **Install** ships adapters for **Cursor, Claude Code, GitHub Copilot, and OpenAI Codex** (plus root `AGENTS.md`). See [Architecture](docs/guide/Architecture.md).

Re-run `install` anytime to refresh skills; your `.specs/` decisions and `STATE.md` are kept.

### Governance focus (3.2+)

Spec Guardrails is a **single product**: governance, evidence, verification, and controlled execution for agentic software development — not a bundle of companion packages.

| Capability | What it does |
| --- | --- |
| **Artifact gates** | Structural quality for spec, tasks, and cross-artifact consistency — with **blocking / warning / info** severity |
| **Parallel waves** | `loop-plan` computes safe parallel groups; `workspace-prepare` isolates tasks in git worktrees |
| **Execution policy** | Budgets, path scope, and escalation rules in `.specs/config.yaml` — consult via `execution-policy` |
| **Independent verify** | Fresh-context verification with evidence-or-zero (`validate-state`) |

| Need | Command |
| --- | --- |
| First time / upgrade | `install` |
| Existing codebase | `project-init` (optional) |
| Something looks wrong | `doctor` |
| Full CLI list | `--help` |

---

## How it works in one screen

Four ideas stack — full explanation: **[Concepts](docs/guide/concepts.md)**

| Idea | What it is | What it does |
| --- | --- | --- |
| **Spec-driven** | Written plan before code | `spec.md` + `tasks.md`; evidence before “done” |
| **Brakes / Gates** | Structural stop-gates | Python scripts exit non-zero when paperwork or evidence is missing |
| **Loop** | Execute in waves | `loop-plan` picks the next jobs; sub-agents when files don’t overlap |
| **Graph** | Parallel task map | `task-graph.md` — safe parallelism without file collisions |
| **Memory** | Persistent project state | `.specs/` — specs, decisions, and handoff survive across chats |

**You** approve specs and tasks. **The agent** runs gates and implements. **Gates** exit non-zero when paperwork or evidence is missing.

Plain-language tour: [Home](docs/guide/Home.md) · [How it works](docs/guide/How-it-works.md) · [Quick start](docs/guide/Quick-start.md)

---

## Operating modes

Two modes, one package — pick how much rigor you want:

| Mode | Runtime | What you get | Best for |
| --- | --- | --- | --- |
| **Process** | Node.js 18+ | Spec-driven workflow, `.specs/` memory, progressive loading, independent `/verify` | Flexible ceremony, exploration, teams that enforce by review |
| **Brakes** | Node + **Python 3.10+** | Everything in Process **plus** Python gates from the [Guarantees matrix](#guarantees-matrix) — exit ≠ 0 → stop and fix | The **full Spec Guardrails** — traceability, evidence, and structural guarantees enforced automatically |

**Gates stay Python.** That is the product: Brakes mode is the complete version with automated enforcement. Process mode is the same loop without exit-code brakes — intentional, not incomplete.

Install Python when you want gates to fire; run `doctor` to confirm Brakes are available.

---

## Guarantees matrix

**Guarantees are the product.** Commands are implementation.

| Guarantee | Mechanism | Mode | Enforcement |
| --- | --- | --- | --- |
| Intent exists before code | `validate-spec` | Brakes | Hard gate |
| Tasks derive from requirements | `analyze-artifacts` | Brakes | Hard gate |
| Task shape and graph when needed | `validate-tasks` | Brakes | Hard gate |
| Requirements stay traceable | `validate-traceability` | Brakes | Hard gate |
| Quick evidence is complete | `validate-quick` | Brakes | Hard gate |
| Dependencies respected in Execute | `loop-plan` | Brakes | Hard gate |
| Parallel work is file-safe | `task-graph.md` + `validate-tasks` | Process + Brakes | Artifact + gate |
| Completion cites evidence | `validate-state` | Brakes | Hard gate |
| Commits follow policy | `check-commit` | Brakes | Hard gate |
| Lessons grounded after FAIL | `lessons` | Brakes | Hard gate |
| Verification is independent | `/verify` + `validate.md` | Process | Phase skill |
| Knowledge survives chats | `.specs/` + `archive-feature` | Process | Install + CLI |

Full matrix, limits, and phase diagram → **[Guarantees matrix](docs/guide/Guarantees-matrix.md)** · [Architecture](docs/guide/Architecture.md) (Core + adapters)

---

## Token cost

Progressive loading is the main cost win: **one working set per turn**, not the entire playbook.

| Profile | Est. tokens | When |
| ---: | ---: | --- |
| Naive full dump (don’t) | ~31k | Loading every skill + reference every message |
| Specify turn | ~9k | `/specify` — hub + `specify.md` + standards |
| Tasks turn | ~10k | `/tasks` — hub + `tasks.md` + task-graph skill |
| Execute `/loop` (one wave) | ~4k | One implement wave (inline or parallel) |
| Verify turn | ~6k | Independent reviewer stack |

Savings vs full dump: **~72%** (Specify), **~86%** (Execute). Numbers from `lib/token-cost.js`; CI guardrails in `test/test_token_cost.test.js`. Order-of-magnitude only — not a billing API.

More: [Token efficiency](docs/guide/Token-efficiency.md)

---

## Complexity tiers (how work flows)

The hub **Complexity Router** picks how much ceremony a feature needs — Quick, Simple, Medium, Complex, or Parallel. It is **not** a separate product feature; it is how the agent decides which phases to run.

| Tier | Typical scope | Path |
| --- | --- | --- |
| **Quick** | ≤3 files, no new deps | `/quick` → verify → commit |
| **Simple** | Small localized change | `/specify` → `/loop` → `/verify` |
| **Medium** | New feature, &lt;10 tasks | `/specify` → `/tasks` → `/loop` → `/verify` → `/archive` |
| **Complex** | APIs, architecture, infra | + `/discuss`, `/plan`, optional security/QA on verify |
| **Parallel** | Splittable work | Above + `/task-graph` when 3+ tasks |

Rules and examples: [Concepts → Complexity tiers](docs/guide/concepts.md#complexity-tiers--how-the-agent-chooses-depth)

---

## Hub and skills (summary)

Install copies a **hub** (`agent-architecture.md`), **phase references** (`references/*.md`), and **sister skills** (security, task-graph, …). The agent loads **one phase file at a time**.

| Load order | Layer | Role | Examples |
| ---: | --- | --- | --- |
| 1 | **Hub** | Contract, complexity router, gate schedule | `agent-architecture.md` |
| 2 | **Reference** | One phase procedure per turn | `specify.md`, `implement.md`, `validate.md` |
| 3 | **Sister** (optional) | Cross-cutting depth, on demand | `engineering-standards.md`, `task-graph-engineering.md` |
| 4 | **Gate** | Automatic check at the boundary | `validate-spec`, `loop-plan`, `check-commit` |

Conditional sisters (`appsec.md`, `qa-strategy.md`, …) load **one at a time** on Verify when risk warrants it.

Full map: **[Skills and hub](docs/guide/skills-and-hub.md)**

---

## Gates (summary)

Commands implement the guarantees above. Scripts in `.specs/guardrails/scripts/`. **Exit ≠ 0 → stop and fix.**

| When | Gate | What it blocks |
| --- | --- | --- |
| Before approving spec | `validate-spec` | Incomplete or untestable spec |
| Before approving tasks | `analyze-artifacts` | Spec ↔ tasks drift |
| Before approving tasks | `validate-tasks` | Bad tasks; missing graph when 3+ tasks |
| After tasks / with validation | `validate-traceability` | REQ missing from tasks or coverage lines |
| End of `/quick` | `validate-quick` | Incomplete Quick TASK/SUMMARY; >3 files; sensitive paths |
| Each `/loop` wave | `loop-plan` | Blocked dependencies; shows parallel groups |
| Each commit | `check-commit` | Non-Conventional commit message |
| Before “done” | `validate-state` | Fake PASS without test evidence |
| After Verify FAIL | `lessons` | Ungrounded “lessons learned” |
| After Verify PASS | `archive-feature` | (CLI) folds feature into domain memory |

Full reference: **[Gates](docs/guide/gates.md)** · [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Gates and guarantees](docs/guide/Gates-and-guarantees.md)

---

## Documentation

| Doc | For |
| --- | --- |
| [Guarantees matrix](docs/guide/Guarantees-matrix.md) | Product promises → mechanisms |
| [Architecture](docs/guide/Architecture.md) | Core vs platform adapters |
| [Agent commands](docs/guide/agent-commands.md) | Every `/specify`, `/loop`, `/verify`, … — purpose, when, examples |
| [Quick start](docs/guide/Quick-start.md) | First ten minutes |
| [Concepts](docs/guide/concepts.md) | Spec-driven + guardrails + loop + graph |
| [Skills and hub](docs/guide/skills-and-hub.md) | What each skill file does |
| [Gates](docs/guide/gates.md) | How each gate works |
| [Platform parity](docs/guide/Platform-parity.md) | Shipped adapters (Cursor, Claude, Copilot, Codex) — core works with any agent |
| [Restart PRD seed](docs/guide/Restart-prd-seed.md) | Clean-project PRD template for a single-package restart |
| [FAQ](docs/guide/FAQ.md) | Common questions |
| [Changelog](docs/CHANGELOG.md) | Full version history |

Start after install: [Quick start](docs/guide/Quick-start.md) · [Agent commands](docs/guide/agent-commands.md)

---

## Upgrading

```bash
npx @luizsantiago/spec-guardrails install
```

| Version | What you gain |
| --- | --- |
| **3.2.x** | Single-package focus; artifact gate severity labels; git worktree isolation CLI; execution policy (budget/scope/escalation) |
| **3.1.x** | Copilot/Codex/AGENTS.md adapters; doctor Process + Brakes scores; `validate-traceability` / `validate-quick`; `classify-change` / `feature-status` |
| **3.0.x** | Final name Spec Guardrails; `.specs/guardrails/`; no dual-path ([Migration](docs/guide/Migration.md)) |
| **2.2.x** | Seatbelt-era paths & markers; `doctor` Execute hints; docs split from README |
| **2.1.x** | `loop-plan` + parallel `/loop` waves |
| **2.0.x** | Package rename → `@luizsantiago/spec-seatbelt` (superseded by 3.0) |
| **1.1.x** | `project-init` for brownfield repos |
| **0.9.x** | `archive-feature` + domain memory merge |

Full history: [CHANGELOG](docs/CHANGELOG.md) · [Releases](https://github.com/luizssantiago92/spec-guardrails/releases) · [Stability policy](docs/guide/Stability-policy.md)

Lineage: `agentic-harness` → `spec-seatbelt` → **`spec-guardrails` (final)**. Run `install` once after switching. See [Migration](docs/guide/Migration.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — tests, gate freeze policy, local `npm run guardrails -- install`.

---

## Credits

Spec Guardrails adapts open ideas; we did not invent spec-driven phases, loop design, or task-graph rules.

### Core lineage

| Source | License | How we use it |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | CC-BY-4.0 | Phase model, `.specs/` memory, gate lineage |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Discuss patterns, definition-of-done |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | Task-graph topology, stop rules, parallel merge |

### Loop & ecosystem

| Source | License | How we use it |
| --- | --- | --- |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | Operational loop patterns; `doctor` score metaphor |
| [Addy Osmani — Loop engineering](https://addyosmani.com/blog/loop-engineering/) | — | Essay lineage |
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | CC0 | Ecosystem taxonomy |

### Adjacent (not vendored)

[DeepCode](https://github.com/HKUDS/DeepCode) · [RepoGraph](https://github.com/ozyyshr/RepoGraph)

Extended attribution: [docs/guide/credits.md](docs/guide/credits.md)

## License

MIT
