# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Governed spec-driven development for AI coding agents.**

Spec Guardrails installs a working method into your repository: the agent writes down what it is going to build, gets your approval, implements in small waves, and proves the result before calling it done. Nothing about your stack changes — you get written requirements, a task plan, and verification evidence stored as files in the project.

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.1.x**

---

## What changes in practice

| Without it | With Spec Guardrails |
| --- | --- |
| The agent jumps straight to code and says "done" | Requirements are written and approved first, and "done" needs evidence |
| Each new chat starts from zero | Specs, decisions, and state live in `.specs/` and survive the session |
| Small fixes and risky features get the same treatment | The agent measures complexity and applies only the depth the change needs |
| The whole playbook is pasted into every message | One phase guide is loaded per turn, which keeps cost and focus under control |

You stay in charge of scope: the agent proposes, you approve specs, task plans, and anything that touches git beyond local commits.

Read more: [Overview](docs/guide/Overview.md) · [How it works](docs/guide/How-it-works.md) · [Concepts](docs/guide/concepts.md)

---

## Install

Run once in your project root:

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

`install` writes the phase guides for your agent and creates the `.specs/` folder. Re-run it after upgrading the package — your existing `.specs/` notes are preserved. After that, you work in **agent chat**, not in the terminal; the agent calls the CLI and checks when needed.

| Requirement | Role |
| --- | --- |
| **Node.js 18+** | Required — the CLI and the install step |
| **Python 3.10+** | Optional — turns on automatic proof at each step |

### Do you need Python?

**Node alone is enough to use everything** — every phase, every document, every approval point. The full process runs the same way.

The difference is who decides whether a step is really finished:

- **Without Python** — the agent checks its own work by reading the phase checklist. It works, but you are trusting the agent to be honest when it is eager to move on.
- **With Python** — the same checks run automatically, and the agent **cannot advance** with half-done work: saying "done" without test evidence, writing a task that matches no requirement, or closing a step with an open question all stop the process until fixed.

In short: Python turns "trust the agent" into "the agent has to prove it."

Which checks exist and what each one requires: [Gates](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md)

Read more: [Quick start](docs/guide/Quick-start.md) · [Platform parity](docs/guide/Platform-parity.md) · [CHANGELOG](docs/CHANGELOG.md)

---

## How you use it day to day

You describe your project or the feature you want — in chat, or by pointing the agent at a file such as `prd.md` or `docs/brief.md`. With Spec Guardrails already installed, the agent reads that material plus what is already in the repo and picks up from there if work is in progress (`STATE.md` tells it where you left off).

```
     YOU describe the project or feature
     (chat, prd.md, docs/brief.md, kickoff paste)
              │
              ▼
   ┌──────────────────────┐
   │  READ & CLASSIFY     │   Agent reads your inputs and the repo,
   │                      │   then sizes the change (see table below).
   └──────────┬───────────┘
              │
        Still vague? ──► Requirements analysis (optional)
              │          Up to 5 questions per round, one topic at a time,
              │          with suggested options — never repeats what your
              │          document already answered.
              ▼
   ┌──────────────────────┐
   │  REQUIREMENTS BRIEF  │   Captured gaps and decisions in writing.
   └──────────┬───────────┘
              │
        ◆ YOU APPROVE ◆        (1 of 3 — when elicitation ran)
              │
              ▼
   ┌──────────────────────┐
   │  SPECIFY             │   What must happen, what "done" means,
   │                      │   what is out of scope → spec.md
   └──────────┬───────────┘
              │
        ◆ YOU APPROVE ◆        (2 of 3)
              │
              ▼
   ┌──────────────────────┐
   │  TASKS               │   Small checkable jobs → tasks.md
   │                      │   (+ task-graph.md when work can split)
   └──────────┬───────────┘
              │
        ◆ YOU APPROVE ◆        (3 of 3)
              │
              ▼
   ┌──────────────────────┐
   │  BUILD (loop)        │   One wave at a time: test, implement,
   │        ↺             │   check, commit — repeat until done.
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │  VERIFY              │   Independent review with proof → validation.md
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │  ARCHIVE             │   Fold outcome into project memory.
   └──────────────────────┘

   Tiny fix (≤3 files, no new dependency)?
   Express lane: build → verify → commit (no spec/tasks ceremony).
```

The agent never skips your approvals on the full path. Requirements analysis is **suggested**, not forced — if the request is already clear, it goes straight to Specify.

Read more: [How it works](docs/guide/How-it-works.md) · [Agent commands](docs/guide/agent-commands.md)

---

## How it sizes the work

Before starting, the agent classifies the change and loads only what that change needs. A typo does not get a task graph; a payments integration does not skip review.

| Complexity | Typical scope | What gets created | Your approvals |
| --- | --- | --- | --- |
| **Quick** | ≤3 files, no new dependency, no auth/payments | Code + quick evidence | None (express lane) |
| **Simple** | Small localized change, 2–5 files | `spec.md` → code → `validation.md` | Spec |
| **Medium** | Real feature, under ~10 jobs | `spec.md`, `tasks.md` → code → `validation.md` → archive | Spec + tasks |
| **Complex** | New APIs, architecture, infrastructure | Above + `design.md`, option discussion | Spec + tasks (+ design when used) |
| **Parallel** | Work safely splittable across agents | Above + `task-graph.md` | Spec + tasks |

This is also why sessions stay affordable: the agent loads one short guide per step instead of the entire playbook.

Read more: [Complexity tiers](docs/guide/concepts.md#complexity-tiers--how-the-agent-chooses-depth) · [Token efficiency](docs/guide/Token-efficiency.md)

---

## What is inside the kit

Each block names what ships in the package, how many pieces there are, and what you get from it. Technical detail lives in the linked guides.

### Artifacts (12)

Plain markdown in `.specs/` — the paper trail that survives the chat and reviews like code in git.

| File | What it holds |
| --- | --- |
| `STATE.md` | Active feature, current phase, next step |
| `requirements-brief.md` | Answers from requirements analysis, signed off by you |
| `spec.md` | Requirements, acceptance criteria, out of scope |
| `exploration.md` | Compared solution options (when used) |
| `design.md` | Technical approach and decisions (when used) |
| `tasks.md` | Checkable jobs with file ownership |
| `task-graph.md` | Which jobs can run in parallel (when used) |
| `validation.md` | Independent verify verdict and proof |
| `project/PROJECT.md` | Long-lived repo map |
| `project/ROADMAP.md` | Planned and delivered features |
| `domains/<slug>/spec.md` | Consolidated domain knowledge after archive |
| `lessons.json` | Rules learned from past failures |

→ [Architecture](docs/guide/Architecture.md)

### Skills (1 hub + 19 phase guides + 8 specialists)

Instructions the agent loads **one at a time** — hub `agent-architecture.md` (router + contract), phase guides such as `specify.md`, `tasks.md`, `implement.md`, `validate.md`, and specialists such as `appsec.md`, `qa-strategy.md`, `security-review.md` when the work needs them.

→ [Skills and hub](docs/guide/skills-and-hub.md)

### Gates (9)

Automatic checks at step boundaries — each one blocks a specific kind of shortcut:

| Gate | Stops the agent when… |
| --- | --- |
| `validate-req-analysis` | Requirements brief has open questions or no owner approval |
| `validate-spec` | Spec has no testable acceptance criteria |
| `analyze-artifacts` | A requirement has no matching task |
| `validate-tasks` | Tasks are vague or file ownership conflicts |
| `validate-traceability` | REQ → task → proof chain is broken |
| `validate-state` | Feature is declared done without evidence |
| `validate-quick` | Quick-mode fix broke its size or shape rules |
| `check-commit` | Commit message does not follow the agreed format |
| `lessons` | A failed verify tries to skip the lesson step |

→ [Gates](docs/guide/gates.md) · [Garantees matrix](docs/guide/Guarantees-matrix.md)

### Requirements analysis

When the request is still fuzzy, the agent asks a **few targeted questions** — at most five per round, one topic at a time, always with suggested options — and never re-asks what your document already answered. You approve the brief before Specify starts.

→ [Requirements analysis](docs/guide/requirements-analysis.md)

### Loops

Implementation happens in **small waves**: pick the next runnable jobs, test, implement, check, commit, repeat. Parallel work only when two jobs touch different files; if tests fail, the agent retries a bounded number of times before escalating to you.

→ [Loop patterns](docs/guide/loop-patterns.md)

### Memory (6 commands)

`memory-index`, `memory-search`, `memory-query`, `memory-retrieve`, `episodes`, and `code-index` — so a new session or teammate can ask "what did we decide about session timeout?" without you re-explaining. Lessons from verify failures feed back into future runs.

→ [Memory](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md)

### Optional — off by default

| Capability | What it adds |
| --- | --- |
| **Cursor IDE hooks** | Scope check before file edits and shell-command policy on Cursor — disabled by default; requirements analysis can ask if you want them; you can also enable or disable anytime in chat |
| **Semantic memory search** | Find past specs and decisions by meaning, not just keywords |

→ [Cursor hooks and sandbox](docs/guide/Cursor-hooks-and-sandbox.md) · [Memory](docs/guide/Memory.md)

---

## What lands in your repository

| Path | Role |
| --- | --- |
| `.cursor/skills/` (+ Claude, Copilot, Codex trees) | Phase instructions for the agent |
| `.specs/STATE.md` | Active feature and next step |
| `.specs/features/NNN-slug/` | Spec, tasks, and validation per feature |
| `.specs/guardrails/scripts/` | Python checks (when Brakes mode is on) |
| `.specs/config.yaml` | Optional project rules and execution policy |

---

## Documentation

| Topic | Start here | Go deeper |
| --- | --- | --- |
| Orientation | [Overview](docs/guide/Overview.md) | [Concepts](docs/guide/concepts.md) |
| First session | [Quick start](docs/guide/Quick-start.md) | [Agent commands](docs/guide/agent-commands.md) |
| Process model | [How it works](docs/guide/How-it-works.md) | [Loop patterns](docs/guide/loop-patterns.md) |
| Enforcement | [Gates](docs/guide/gates.md) | [Gates and guarantees](docs/guide/Gates-and-guarantees.md) |
| Requirements | [Requirements analysis](docs/guide/requirements-analysis.md) | [Agent commands → /elicit](docs/guide/agent-commands.md) |
| Long-running projects | [Memory](docs/guide/Memory.md) | [Brownfield context](docs/guide/brownfield-context.md) |
| Cursor IDE (optional) | [Cursor hooks and sandbox](docs/guide/Cursor-hooks-and-sandbox.md) | [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| Questions | [FAQ](docs/guide/FAQ.md) | [Stability policy](docs/guide/Stability-policy.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## Contributing

Focused improvements to skills, gates, CLI, docs, and tests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for repository layout, gate stability rules, and local checks.

**Build your contribution with Spec Guardrails.** In your own project or fork, install the latest stable release and let the phases guide the change:

```bash
npx @luizsantiago/spec-guardrails@latest install
npx @luizsantiago/spec-guardrails doctor
```

Describe the change in chat, approve the spec and the task plan, implement, and verify before opening the pull request — the resulting `.specs/` folder is the evidence that supports your PR.

**In this source repository**, work against your branch instead of the published package:

```bash
git clone https://github.com/luizssantiago92/spec-guardrails.git
cd spec-guardrails
npm install
npm run guardrails -- install
npm run guardrails -- doctor
```

Edit sources under `skills/`, `lib/`, `scripts/`, and `rules/`; re-run `npm run guardrails -- install` after changing shipped assets, and run `npm test` before every PR.

---

## Credits

Spec Guardrails adapts patterns from open-source work. These are the projects whose ideas are actually shipped in the package:

| Project | License | Used for |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | CC-BY-4.0 | Spec → tasks → execute → verify model, `.specs/` layout, gate philosophy |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Design-discussion patterns and definition-of-done framing |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | Task-graph rules behind safe parallel waves |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | Wave-based execution model |

Everything else — the CLI, the Python checks, the platform adapters, and the requirements-analysis phase — is original work in this repository. Full lineage, including references we cite but do not bundle: [Credits and lineage](docs/guide/credits.md).

---

## License

MIT — see [LICENSE](LICENSE).
