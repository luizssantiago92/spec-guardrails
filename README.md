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

Works with **Cursor, Claude Code, Copilot, Codex**, and other agents.

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.7.x**

**Docs:** [Overview](docs/guide/Overview.md) · [Quick start](docs/guide/Quick-start.md) · [Full guide index](docs/guide/README.md)

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

## Capabilities we strongly recommend — not afterthoughts

Beyond the three pillars, these ship in every install and matter as soon as you run real features. They are why teams **stay** on the method — not only why they try it once.

### Independent Verify — the author does not grade their own homework

**Without it:** The same chat that wrote the code declares victory. Confirmation bias is built in — the model “remembers” intent, not what the diff actually does.

**With `/verify`:** A **fresh context** (when possible) writes `validation.md`: PASS or FAIL, gaps listed, evidence as `file:line` citations. The hub enforces **author ≠ verifier**. You get a second opinion that is procedural, not polite.

**Go deeper:** [How it works → Verify](docs/guide/How-it-works.md) · [validate.md](docs/guide/agent-commands.md)

---

### Traceability — every requirement earns a proof path

**Without it:** “We tested auth” means nothing in review. Nobody can tell which acceptance criterion maps to which test line.

**With traceability gates:** Every `REQ` must appear in tasks; `validation.md` must cite coverage lines. The chain **REQ → task → evidence** is structural — gaps fail the gate before you merge. It does not prove tests are *good* (we are honest about that), but it proves you cannot close a feature with orphan requirements or empty proof.

**Go deeper:** [Guarantees matrix](docs/guide/Guarantees-matrix.md) · [feature-overview](docs/guide/agent-commands.md)

---

### Lessons — failures become team rules

**Without it:** The agent hits the same verify FAIL twice — wrong assumption about sessions, missed edge case on uploads — because nothing persisted except chat regret.

**With `lessons`:** A failed verify produces grounded entries in `lessons.json`, promoted to **confirmed** rules over time. The next feature loads them before Design and Execute. Memory tells you *what* happened; lessons tell the agent *what not to repeat*.

**Go deeper:** [Memory → lessons](docs/guide/Memory.md) · [lessons gate](docs/guide/gates.md)

---

### Complexity router — right ceremony for the risk

**Without it:** A one-line typo gets a twelve-page spec; a payment integration ships on vibes because “it felt small.”

**With `classify-change` + hub tiers:** Quick → Parallel picks depth before phases load — express lane for ≤3 files, full design + task graph when architecture or parallel work demands it. You save tokens **and** avoid under-governing risky changes.

![Complexity tiers — Quick, Simple, Medium, Complex, Parallel](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/tiers.svg)

**Go deeper:** [Concepts → complexity tiers](docs/guide/concepts.md#complexity-tiers--how-the-agent-chooses-depth) · [Token efficiency](docs/guide/Token-efficiency.md)

---

### Brownfield onboarding — existing repos, not greenfield fantasies

**Without it:** `.specs/` is empty while `src/` has years of history. The agent guesses stack and boundaries every session.

**With `project-init`:** Detects stack (Node, Python, compose, CI, AI signals), scaffolds `PROJECT.md`, domains, `ROADMAP.md`, and suggests presets (`python-platform` when infra/AI paths show up). Optional `code-index` gives lightweight symbol search — not a full RepoGraph, but enough to stop blind edits.

**Go deeper:** [Brownfield context](docs/guide/brownfield-context.md) · [project-init](docs/guide/agent-commands.md)

---

### Safe parallel execution — speed without file collisions

**Without it:** Two agents edit the same module; merges become archaeology. Or parallelism never happens because it feels unsafe.

**With `loop-plan` + `task-graph.md` + `workspace-prepare`:** Waves pick runnable tasks; parallel groups require **disjoint `Files`**; git worktrees isolate batches; sub-agents follow a hub protocol with one merge owner. [graph-engineering](https://github.com/codejunkie99/graph-engineering) ideas, repo-native.

**Go deeper:** [Loop patterns](docs/guide/loop-patterns.md) · [Tutorial 03 — parallel worktrees](docs/guide/tutorials/03-parallel-worktrees.md)

---

### Git tiers — autonomy with a safety rail

**Without it:** Approving a spec feels like giving the agent carte blanche to push, merge, or touch production.

**With tiers in the hub contract:** Approving spec/tasks authorizes **Tier 0 only** — local branch, local commits, `.specs/` in the same repo. Push, PR, merge, deploy need **your** explicit go-ahead. The agent can move fast locally without becoming a liability on shared branches.

**Go deeper:** [git-handoff](docs/guide/agent-commands.md) · [Hub contract](docs/guide/skills-and-hub.md)

---

## Spec-driven development (SDD)

Under the pillars and capabilities above sits the full **spec-driven** method. Lineage: [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven), [loop-engineering](https://github.com/cobusgreyling/loop-engineering), [graph-engineering](https://github.com/codejunkie99/graph-engineering), [loopgate_harness](https://github.com/rxdt/loopgate_harness). **Repo-native harness** — not another desktop runtime.

### Hub and progressive skills

The **hub** (`agent-architecture.md`) is the map: contract, gate schedule, phase order. **Skills load one at a time** — hub → one phase guide → optional sister (~70% fewer skill tokens than dumping the full kit each turn). Sisters (AppSec, QA, security-review, task-graph, platform infra/AI, …) load only when paths or tier demand them.

### Artifacts and feature flow

![Spec Guardrails phase flow — classify, optional elicitation, approvals, build loop, verify, archive](https://raw.githubusercontent.com/luizssantiago92/spec-guardrails/main/.assets/flow.svg)

| Stage | Purpose |
| --- | --- |
| **Explore** (optional) | Research before a feature folder exists |
| **Elicit** (optional) | Requirements brief — [pillar §1](#1-requirements-analysis--stop-building-the-wrong-thing) |
| **Specify** | `spec.md` — you approve |
| **Discuss / Design** (when needed) | Product gray areas; `solution-explore` when architectures truly fork |
| **Tasks** | Atomic jobs + file ownership — you approve |
| **Execute** | `/loop` waves — [loop-plan](docs/guide/loop-patterns.md), gate, commit |
| **Verify** | Independent proof — [recommended §](#independent-verify--the-author-does-not-grade-their-own-homework) |
| **Archive** | Domain memory + roadmap |

**Go deeper:** [How it works](docs/guide/How-it-works.md) · [Skills and hub](docs/guide/skills-and-hub.md) · [Ecosystem map](docs/guide/ecosystem.md)

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

Still shipped — useful when policy, visibility, or architecture forks matter. Less central than the pillars and sections above; none are throwaways.

| Capability | Without it | With it |
| --- | --- | --- |
| **`doctor`** | Guess if install is healthy | Process + Brakes scores and fix hints |
| **`feature-status` / `feature-overview`** | Hunt through folders | Checklist + REQ → task → evidence dashboard |
| **Presets** (`default`, `node-ts`, `python`, `python-platform`) | Generic rules only | Stack-aware `config.yaml` seeds |
| **`execution-policy`** | Unbounded agent scope | Path allow/deny, retry and run budgets |
| **`context-guard`** | Edits outside approved scope | Check before edit / before “complete” |
| **`sandbox check-command`** | Destructive shell slips through | Warn or block `rm -rf`, force-push, … |
| **`solution-explore`** | Architecture fork in chat only | `exploration.md`, candidates, recorded decision |
| **`/quick` lane** | Tiny fixes over-processed | ≤3 files, express evidence path |
| **Sister skills** | One generic pass | On-demand AppSec, QA, security-review, ship-ready, code-simplify |
| **`converge`** | Drift silently grows | Recover when spec and tasks diverge |
| **`constitution`** | Principles only in chat | Once-per-project principles artifact |
| **Tutorials** | Learn by trial and error | Progressive guides (quick → parallel → python platform) |
| **Semantic memory** (optional) | Keyword search only | `memory-index embed` when vocabulary drifts |

**Go deeper:** [Agent commands](docs/guide/agent-commands.md) · [Tutorials](docs/guide/tutorials/README.md) · [Architecture](docs/guide/Architecture.md)

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
