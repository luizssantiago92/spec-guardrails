# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![CI](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml/badge.svg)](https://github.com/luizssantiago92/spec-guardrails/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Spec Guardrails — governed spec-driven development for AI coding agents](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/banner.svg)

**Governed spec-driven development for AI coding agents.**

Agents are fast — and optimistic. They ship code, summarize what they *think* they did, and move on. Spec Guardrails installs a **repeatable contract** into your repo: agree on the goal in writing, break work into provable steps, implement in waves, and verify with evidence that lives in **git**, not in a chat scrollback.

You keep control: the agent proposes; you approve specs and tasks; push, merge, and deploy stay on your terms.

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.7.x**

**Docs:** [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Full guide index](docs/guide/README.md)

---

## Install

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

| Requirement | What you get |
| --- | --- |
| **Node.js 18+** | CLI, skills, `.specs/` scaffold, full SDD workflow |
| **Python 3.10+** (optional) | **Brakes mode** — gates that **block** incomplete work (see below) |

`install` detects your agent (Cursor, Claude Code, Copilot, Codex), writes one skill tree, and creates `.specs/`. Re-run after upgrades — your notes stay. Day to day you work in **chat**; the agent runs CLI and gates when phases demand it.

**Go deeper:** [Quick start](docs/guide/Quick-start.md) · [Platform parity](docs/guide/Platform-parity.md)

---

## Why teams adopt it — three pillars

Most agent failures are not “bad code in one file.” They are **wrong goal**, **lost context**, or **fake done**. Spec Guardrails attacks those three problems directly.

### 1. Requirements analysis — stop building the wrong thing

**Without it:** “Add login” becomes three different products in three chats — OAuth vs magic link vs username/password — and you discover the mismatch halfway through a PR.

**With `/elicit`:** The agent asks a **small number of sharp questions** (at most five per round, one topic at a time, always with suggested options). It reads what you already wrote (`prd.md`, `docs/brief.md`, kickoff notes) and **does not re-ask** what those files already answer. You approve a **requirements brief** before `spec.md` exists — so vague chat does not harden into vague acceptance criteria.

| Without analysis | With analysis |
| --- | --- |
| Assumptions stay implicit in chat | Assumptions surface early with owners |
| Spec rewrites mid-build | Spec starts from an approved brief |
| “I thought you meant…” after code exists | Disagreement costs minutes, not days |

It is **suggested**, not mandatory — clear requests can go straight to `/specify`. The win is catching ambiguity **before** the agent treats a half-sentence as a contract.

**Go deeper:** [Requirements analysis](docs/guide/requirements-analysis.md) · [/elicit in agent commands](docs/guide/agent-commands.md)

---

### 2. Gates (Brakes) — “done” has to be provable

**Without gates (Process mode):** The agent *can* follow the checklist in skills. When it is eager to please, it can also *skip* steps — thin spec, orphan tasks, “done” with no test citation — and you only notice in review.

**With Python + Brakes:** The same rules become **scripts with exit codes**. Non-zero = **STOP**. Fix the artifact, re-run. No silent drift.

| Moment | What gates protect |
| --- | --- |
| **Before spec approval** | Criteria are testable (`SHALL`/`MUST`), assumptions documented |
| **Before task approval** | Every REQ maps to a task; tasks have shape and file ownership |
| **Each commit** | Conventional message, no empty staged diff, no linter/test bypass in the diff |
| **Before “feature done”** | Traceability REQ → task → `file:line` evidence; PASS verdict in `validation.md` |
| **After verify FAIL** | Lessons are recorded — failures become rules, not forgotten |

**Node alone is enough** for the full ceremony. **Python turns trust into proof** — especially valuable on teams where the agent runs unsupervised between your approvals.

Twelve gates cover planning, building, and closing (including `validate-ship-surface` when you use the python-platform preset). We do not list every command here; the value is the **rhythm**: boundaries you can audit in git, not vibes in chat.

**Go deeper:** [Gates reference](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [Process vs Brakes (FAQ)](docs/guide/FAQ.md#process-vs-brakes)

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

**Search is optional** — keyword index, graph expansion, semantic embed when you configure it — but the **markdown artifacts alone** already beat chat-only workflows for any team that ships more than one feature.

**Go deeper:** [Memory guide](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md)

---

## Spec-driven development (SDD)

Under those three pillars sits a full **spec-driven** method: the agent follows phases instead of improvising. Lineage includes [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) (SDD + `.specs/`), [loop-engineering](https://github.com/cobusgreyling/loop-engineering) (waves), [graph-engineering](https://github.com/codejunkie99/graph-engineering) (safe parallel tasks), and [loopgate_harness](https://github.com/rxdt/loopgate_harness) (enforcement patterns). You get a **repo-native harness** — not another desktop runtime.

### Hub, complexity, and skills

The **hub** (`agent-architecture.md`) is the map: contract, gate schedule, git tiers, and a **complexity router** (Quick → Parallel). A typo does not get a task graph; a payments integration does not skip review.

![Complexity tiers — Quick, Simple, Medium, Complex, Parallel](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/tiers.svg)

**Skills load one at a time** — hub → one phase guide → optional sister. Loading the entire playbook every turn burns context and money (~70% more skill tokens than progressive loading on typical Medium features). Sisters (security, QA, task-graph, platform infra/AI, …) appear only when the work needs them.

### Artifacts and feature flow

![Spec Guardrails phase flow — classify, optional elicitation, approvals, build loop, verify, archive](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/flow.svg)

| Stage | Purpose |
| --- | --- |
| **Explore** (optional) | Research before a feature folder exists |
| **Elicit** (optional) | Requirements brief — pillar §1 |
| **Specify** | `spec.md` — you approve |
| **Discuss / Design** (when needed) | Gray product choices and technical approach |
| **Tasks** | Atomic jobs + file ownership — you approve |
| **Execute** | `/loop` waves — implement, gate, commit |
| **Verify** | Independent `validation.md` — author ≠ verifier |
| **Archive** | Merge into domain memory and roadmap |

**Sub-agents** scale Execute when many tasks are parallel-safe: batched dispatch, disjoint files, one merge owner — protocol in the hub, not chaotic multi-agent free-for-all.

**Go deeper:** [How it works](docs/guide/How-it-works.md) · [Skills and hub](docs/guide/skills-and-hub.md) · [Loop patterns](docs/guide/loop-patterns.md) · [Token efficiency](docs/guide/Token-efficiency.md) · [Ecosystem map](docs/guide/ecosystem.md)

---

## Python Platform (optional — 4.7+)

For teams shipping **Python backend + DevOps + AI** from one repo — Docker, CI, Terraform, Helm, plus LLM/RAG/MCP/eval paths.

```bash
npx @luizsantiago/spec-guardrails init-config --preset python-platform
```

**Without it:** Infra and AI concerns stay implicit — deploy steps live in someone’s head, eval harnesses are “we’ll add tests later,” rollback is discovered during an incident.

**With it:** `design.md` gains **Ship Surface** (deploy unit, CI, rollback) and **AI Surface** (eval harness, fallback, scope). When task `Files` touch matching paths, `validate-ship-surface` blocks verify until those fields exist. Sisters `python-devops` and `ai-engineering` load on demand. `feature-overview` adds operational + AI traceability tables.

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

## More capabilities

Everything below ships in the package. The three pillars above are why most teams install; these tools matter when the work grows.

| Capability | Without it | With it |
| --- | --- | --- |
| **`classify-change`** | Same depth for every request | Heuristic tier (quick → complex) before phases load |
| **`doctor`** | Guess if install is healthy | Process + Brakes scores and fix hints |
| **`feature-status` / `feature-overview`** | Hunt through folders | Checklist + REQ → task → evidence dashboard |
| **`project-init`** | Brownfield = blank `.specs/` | Map stack, domains, `PROJECT.md` from existing code |
| **Presets** (`default`, `node-ts`, `python`, `python-platform`) | Generic rules only | Stack-aware `config.yaml` seeds |
| **`loop-plan`** | Agent picks tasks ad hoc | Next runnable wave; parallel groups when files disjoint |
| **Workspaces** (`workspace-prepare`) | Parallel agents collide on files | Git worktrees per parallel task batch |
| **`execution-policy`** | Unbounded agent scope | Path allow/deny, retry and run budgets |
| **`context-guard`** | Edits outside approved scope | Check before edit / before “complete” |
| **`sandbox check-command`** | Destructive shell slips through | Warn or block `rm -rf`, force-push, … |
| **`solution-explore`** | Architecture fork in chat only | `exploration.md`, candidates, recorded decision |
| **`/quick` lane** | Tiny fixes over-processed | ≤3 files, express evidence path |
| **Sister skills** | One generic security pass | On-demand AppSec, QA, security-review, ship-ready, code-simplify |
| **`lessons`** | Same failure twice | Grounded rules from verify FAIL |
| **`converge`** | Drift silently grows | Recover when spec and tasks diverge |
| **`constitution`** | Principles only in chat | Once-per-project principles artifact |
| **Tutorials** | Learn by trial and error | Progressive guides (quick fix → parallel → python platform) |
| **Git tiers** | Agent pushes when it feels done | Tier 0 local only until you approve share/merge |

**Go deeper:** [Agent commands](docs/guide/agent-commands.md) · [Tutorials](docs/guide/tutorials/README.md) · [Architecture](docs/guide/Architecture.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md)

---

## Limitations

We are honest about the ceiling: gates enforce **structure and evidence in `.specs/`** — not product taste, not whether your tests are clever, not a full AST review of implementation code.

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

Focused improvements are welcome — [CONTRIBUTING.md](CONTRIBUTING.md) for layout, gate stability rules, and local checks. Sources: `skills/`, `lib/`, `scripts/`, `rules/`. Run `npm test` before every PR.

---

## Credits

| Project | License | Used for |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | CC-BY-4.0 | SDD loop, `.specs/` layout, gate philosophy |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Design discussion, definition-of-done |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | Task-graph parallelism rules |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | Wave execution |
| [loopgate_harness](https://github.com/rxdt/loopgate_harness) | MIT | Suppression blocking, quality checks as evidence, diagram layout |

Original work here: CLI, Python gates, platform adapters, requirements analysis, Python Platform pack (4.7+). [Full lineage](docs/guide/credits.md).

---

## Documentation

| Topic | Link |
| --- | --- |
| Start here | [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) |
| Chat & CLI | [Agent commands](docs/guide/agent-commands.md) |
| Process | [How it works](docs/guide/How-it-works.md) · [Concepts](docs/guide/concepts.md) |
| Gates | [gates.md](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| Requirements | [requirements-analysis.md](docs/guide/requirements-analysis.md) |
| Memory | [Memory.md](docs/guide/Memory.md) |
| Python platform | [python-platform.md](docs/guide/python-platform.md) |
| Tutorials | [tutorials/README.md](docs/guide/tutorials/README.md) |
| Versions | [CHANGELOG](docs/CHANGELOG.md) · [Product history](docs/guide/Product-history.md) |
| Help | [FAQ](docs/guide/FAQ.md) · [Glossary](docs/guide/Glossary.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## License

MIT — see [LICENSE](LICENSE).
