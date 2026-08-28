# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Governed spec-driven development for AI coding agents.**

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.1.x** · Works with Cursor, Claude Code, GitHub Copilot, and Codex.

---

## What this solves

AI agents are fast but forgetful. Ask for a feature and you usually get code with no written requirement, no record of the decisions, no proof it works, and nothing left behind when the chat window closes. The next session starts from zero.

Spec Guardrails installs a **repeatable process** into your repository so the agent always works the same way:

1. **Write down what is being built** — before any code exists, and you approve it.
2. **Break it into jobs** — a checklist you can read and approve.
3. **Implement in small waves** — one job at a time, each committed.
4. **Prove it works** — a separate verification pass that did not write the code.
5. **Keep the record** — spec, decisions, and proof stay in your repo, in git.

You stay the decision-maker. The agent stops and asks instead of guessing. When the session ends, the reasoning is still there — for you, for your team, and for the next agent run.

It is **not** an application framework, a runtime, or a dependency in your build. It is a set of markdown instructions plus optional check scripts. Remove the folders and your project is untouched.

Deeper: [Overview](docs/guide/Overview.md) · [How it works](docs/guide/How-it-works.md) · [Concepts](docs/guide/concepts.md)

---

## Install

Run once in your project root:

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

`install` writes the agent instructions and a `.specs/` folder. Re-run it after upgrading — your existing notes are preserved. `doctor` confirms everything is wired up.

| Requirement | Role |
| --- | --- |
| **Node.js 18+** | Required — installer and CLI |
| **Python 3.10+** | Optional — turns on the automatic checks ("Brakes mode") |

Without Python you still get the full process; the agent performs the same checks by reading the guides instead of running scripts.

Setup per platform: [Platform parity](docs/guide/Platform-parity.md) · First session: [Quick start](docs/guide/Quick-start.md)

---

## How a feature flows

You work in **agent chat** — normal conversation, in your own language. You do not memorize commands or run the CLI yourself; the agent knows the process and drives it, pausing at the two points where your approval is required.

```
     YOU describe the work
              │
              ▼
   ┌──────────────────────┐
   │  1. UNDERSTAND       │   Vague request? The agent asks questions
   │                      │   first and writes a requirements brief.
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │  2. SPECIFY          │   What gets built, what "done" means,
   │                      │   what is out of scope.
   └──────────┬───────────┘
              │
        ◆ YOU APPROVE ◆        Nothing is coded before this.
              │
              ▼
   ┌──────────────────────┐
   │  3. PLAN             │   The work becomes an ordered job list.
   │                      │   Big changes also get a design step.
   └──────────┬───────────┘
              │
        ◆ YOU APPROVE ◆        Scope is locked here.
              │
              ▼
   ┌──────────────────────┐
   │  4. BUILD            │   One job at a time, tests first,
   │        ↺ loop        │   one commit each. Repeats until done.
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │  5. VERIFY           │   A fresh pass that did not write the
   │                      │   code checks it against the spec.
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │  6. ARCHIVE          │   Outcome and lessons folded into
   │                      │   project memory for future runs.
   └──────────────────────┘
```

Between steps the agent runs structural checks. **A failed check stops the process** rather than letting a half-written spec reach implementation.

Details: [How it works](docs/guide/How-it-works.md) · Phase-by-phase reference: [Agent commands](docs/guide/agent-commands.md)

---

## It sizes the work before starting

The full flow would be absurd for a typo. Spec Guardrails first judges **how big the change actually is**, then loads only the steps and instructions that change needs. A one-line fix skips straight to implementation; a new integration gets the design conversation.

| If the change is… | The agent runs |
| --- | --- |
| A tiny fix — up to 3 files, no decisions | Describe → build → verify → commit |
| Localized — a few files, no new patterns | Specify → build → verify |
| A normal feature — under 10 jobs | Specify → plan → build → verify |
| New architecture, an API, or infrastructure | Specify → discuss options → design → plan → build → verify |
| Splittable across parallel agents | The above, plus a job dependency map |

Two things follow from this, and both matter in practice:

- **Speed** — small work stays small. No ceremony is added to a change that does not need it.
- **Cost and accuracy** — the agent reads one short guide per step instead of the whole playbook. Less context per turn means lower token spend and fewer instructions competing for attention.

The agent proposes the depth and explains why; you can always ask for more or less.

Deeper: [Overview → Three ways to start](docs/guide/Overview.md#three-ways-to-start-pick-one) · [Loop patterns](docs/guide/loop-patterns.md)

---

## What you get, layer by layer

Each layer is useful on its own. You do not have to understand all of them to benefit from the first one.

### Artifacts — the paper trail

Every feature gets a folder of plain markdown in your repo: what was requested, what was decided, the job list, and the verification report. Because it is markdown in git, it reviews like code, diffs like code, and travels with the branch. Months later you can answer "why is this built this way?" without asking anyone.

→ [Artifacts and `.specs/`](docs/guide/Architecture.md)

### Skills — the agent's instruction manual

The process itself is written as short guides the agent reads on demand — one per step. This is why the agent behaves consistently across sessions and across tools: the instructions live in your repo, not in a prompt someone typed once. It also keeps each turn focused, since only the relevant guide is loaded.

→ [Skills and hub](docs/guide/skills-and-hub.md)

### Gates — the checks that stop bad work early

Small scripts verify structure at each handoff: does the spec state acceptance criteria, are the jobs atomic, does the commit reference a real task, is there evidence for the claim of "done". They check **shape, not opinion** — so they are predictable, and they run before you spend time reviewing. A failing gate blocks progress.

→ [Gates](docs/guide/gates.md) · [Gates and guarantees](docs/guide/Gates-and-guarantees.md)

### Requirements analysis — for when the request is still fuzzy

"Make the dashboard better" is not buildable. This layer runs a short structured interview, records the answers and the open questions, and asks you to sign off before anything is specified. It is optional and never forced — but it is where most rework is prevented, because misunderstandings surface while they are still cheap.

→ [Requirements analysis](docs/guide/agent-commands.md)

### Loops — how implementation actually happens

Work advances in waves rather than one giant edit: pick the next job, write the test, make it pass, commit, repeat. Each wave is small enough to review and to roll back. If a wave reveals the plan was wrong, the process stops and returns to planning instead of improvising forward.

→ [Loop patterns](docs/guide/loop-patterns.md)

### Memory — what survives the chat window

State, decisions, and lessons are written to disk as work happens. A new session — or a different agent, or a teammate — reads the current state and continues instead of restarting. Archived features become long-lived project knowledge, and repeated mistakes get recorded as lessons so they stop repeating.

→ [Memory](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md)

---

## What lands in your repository

| Path | What it is |
| --- | --- |
| `.cursor/skills/` (+ Claude, Copilot, Codex trees) | The step-by-step guides the agent reads |
| `.specs/STATE.md` | Current feature and next step |
| `.specs/features/NNN-slug/` | Spec, job list, and verification per feature |
| `.specs/guardrails/scripts/` | The check scripts (Brakes mode) |
| `.specs/config.yaml` | Optional project rules and limits |

All plain text, all in git. Nothing is added to your dependencies or your build output.

---

## Optional extras

Start with the core flow. Turn these on when the work calls for them.

| Capability | What it adds |
| --- | --- |
| Memory search | Find past specs, decisions, and verifications by keyword |
| Code index | A lightweight map of an existing codebase for brownfield work |
| Solution exploration | Compare implementation options side by side before committing |
| Execution policy | Limits on which paths the agent may touch, and budgets |
| Episodic memory | Session notes distilled into lessons for later runs |
| Semantic retrieval | Search memory by meaning instead of keyword — off by default |

### Cursor hooks — optional, and off by default in this repo

On **Cursor**, `install` can register IDE hooks that check scope before a file edit and screen shell commands before they run. They are a safety net, not part of the core flow — everything above works without them.

Be aware they spawn a short-lived **Node** process per action, which can make the IDE feel heavy on busy sessions, especially on Windows. To reduce or remove that cost, delete the `beforeShellExecution` entry from `.cursor/hooks.json` first, then `preToolUse` if needed.

→ [Cursor hooks and sandbox](docs/guide/Cursor-hooks-and-sandbox.md) — what they do, symptoms, tuning, full disable

---

## Documentation

| If you want to… | Read |
| --- | --- |
| Understand the idea | [Overview](docs/guide/Overview.md) · [Concepts](docs/guide/concepts.md) |
| Run your first feature | [Quick start](docs/guide/Quick-start.md) |
| See each step in detail | [How it works](docs/guide/How-it-works.md) · [Agent commands](docs/guide/agent-commands.md) |
| Know what is enforced | [Gates](docs/guide/gates.md) · [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| Work in an existing codebase | [Brownfield context](docs/guide/brownfield-context.md) · [Memory](docs/guide/Memory.md) |
| Tune Cursor IDE behavior | [Cursor hooks and sandbox](docs/guide/Cursor-hooks-and-sandbox.md) |
| Upgrade or check stability | [CHANGELOG](docs/CHANGELOG.md) · [Stability policy](docs/guide/Stability-policy.md) |
| Ask something specific | [FAQ](docs/guide/FAQ.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## Contributing

Focused improvements to skills, gates, CLI, docs, and tests are welcome.

```bash
git clone https://github.com/luizssantiago92/spec-guardrails.git
cd spec-guardrails
npm install
npm run guardrails -- install
npm test
```

Source lives in `skills/` (agent guides), `scripts/` (check scripts), `lib/` (CLI), and `test/`. Re-run `npm run guardrails -- install` after changing shipped assets, and run `npm test` before opening a PR.

We build Spec Guardrails using Spec Guardrails — the recommended contribution workflow, gate stability rules, and the adversarial test policy are in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Credits

Spec Guardrails adapts patterns from these projects. Listed here are the ones whose ideas are **actually shipped** in the package:

| Project | License | What we adapted |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills) | CC-BY-4.0 | The specify → plan → build → verify phase model, the `.specs/` layout, and the "gates as brakes" philosophy |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Discuss-phase patterns (option A/B/C decision records) and definition-of-done framing |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | Job dependency rules — one file owner per wave, stop rule, fake-edge detection |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | The implementation wave model behind the build loop |

Everything else — the Node CLI, the Python gates, the platform adapters, and the requirements analysis phase — is original work in this repository.

Full lineage, including work we cite but do not bundle: [docs/guide/credits.md](docs/guide/credits.md)

---

## License

MIT — see [LICENSE](LICENSE).
