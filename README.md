# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Governed spec-driven development for AI coding agents.**

Spec Guardrails is a process kit that installs phase guides, persistent project memory, and optional structural checks into your repository. Teams keep ownership of requirements and approval gates; agents follow a repeatable path from written intent to verified delivery.

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.1.x**

---

## What it is

Spec Guardrails is **not** an application framework, a vector database, or a replacement for your stack. It is an **operating model** for AI-assisted engineering:

| Layer | Role |
| --- | --- |
| **Phase guides** | Instructions the agent loads one step at a time |
| **Project memory** | `.specs/` — specs, tasks, validation, and state that survive chat sessions |
| **Structural checks** | Optional Python gates that enforce document shape and evidence hooks |

The default loop is **Specify → Tasks → Execute → Verify → Archive**. You approve specs and task plans; the agent implements in waves and produces proof before work is considered done.

Full narrative: [Overview](docs/guide/Overview.md) · [How it works](docs/guide/How-it-works.md)

---

## Why teams use it

| Benefit | Outcome |
| --- | --- |
| **Traceability** | Requirements, jobs, and verification live in version-controlled artifacts |
| **Controlled autonomy** | Agents propose and execute; humans approve scope, design forks, and git tiers |
| **Progressive depth** | Quick fixes skip ceremony; complex work gets discuss, design, and task graphs |
| **Platform-agnostic** | Cursor, Claude Code, GitHub Copilot, Codex, and other agents via root `AGENTS.md` |
| **Token efficiency** | One phase guide per turn instead of dumping the entire playbook |
| **Optional enforcement** | Process mode (Node only) or Brakes mode (Node + Python gates) |

Process vs Brakes: [FAQ](docs/guide/FAQ.md#process-vs-brakes) · Guarantees: [Guarantees matrix](docs/guide/Guarantees-matrix.md)

---

## Install

In your project root:

```bash
npx @luizsantiago/spec-guardrails install
```

Re-run after upgrading the package; existing `.specs/` notes are preserved. Check readiness with `doctor`.

| Requirement | Role |
| --- | --- |
| **Node.js 18+** | Required — CLI and install |
| **Python 3.10+** | Optional — enables Brakes mode (automatic gates) |

Platform setup: [Platform parity](docs/guide/Platform-parity.md) · Release notes: [CHANGELOG](docs/CHANGELOG.md)

---

## How you work day to day

Interaction happens in **agent chat**, not the terminal. The agent runs CLI helpers and gates when needed.

### Core commands

| Command | Use when |
| --- | --- |
| `/specify` | Starting any non-trivial feature — requirements in writing first |
| `/elicit` | Kickoff or request is vague — structured Q&A before Specify *(optional)* |
| `/tasks` | Spec approved — break work into a job list |
| `/loop` | Implementation — one wave at a time |
| `/verify` | All jobs done — independent proof *(prefer a fresh chat)* |
| `/archive` | Feature validated — fold into project memory |
| `/quick` | Tiny fix only (≤3 files, no design fork) |

**Typical path:** `/specify` → approve → `/tasks` → approve → `/loop` → `/verify` → `/archive`

When input is still exploratory, `/explore` or `/elicit` may come first. The agent suggests depth; it does not block Specify without approval.

Command reference: [Agent commands](docs/guide/agent-commands.md) · Entry paths: [Overview → Three ways to start](docs/guide/Overview.md#three-ways-to-start-pick-one)

### Optional capabilities

Enable when the work warrants them — most teams start with the core loop only.

| Capability | Purpose |
| --- | --- |
| Memory search | Retrieve past specs, validations, and kickoff briefs |
| Context guards | Scope check before edit or “done” (Cursor: hooks) |
| Episodic memory | Session notes → lessons for future runs |
| Code index | Lightweight brownfield file and symbol map |
| Solution exploration | Compare implementation options before committing |
| Sandbox policy | Warn or block destructive shell commands (Cursor hook) |
| Execution policy | Path allowlists, budgets, read/write/delete effects |
| Semantic retrieval | Search by meaning — off by default |

Guides: [Memory](docs/guide/Memory.md) · [Cursor hooks and sandbox](docs/guide/Cursor-hooks-and-sandbox.md) · [Brownfield context](docs/guide/brownfield-context.md)

---

## What lands in your repository

| Path | Role |
| --- | --- |
| `.cursor/skills/` (+ Claude, Copilot, Codex trees) | Phase instructions for the agent |
| `.specs/STATE.md` | Active feature and next step |
| `.specs/features/NNN-slug/` | Spec, tasks, and validation per feature |
| `.specs/guardrails/scripts/` | Python gates (Brakes mode) |
| `.specs/config.yaml` | Optional project rules and execution policy |

Architecture: [Skills and hub](docs/guide/skills-and-hub.md) · [Architecture](docs/guide/Architecture.md)

---

## Documentation

Start with the guide that matches your question; each page links deeper where needed.

| Topic | Start here | Go deeper |
| --- | --- | --- |
| Orientation | [Overview](docs/guide/Overview.md) | [Concepts](docs/guide/concepts.md) |
| First session | [Quick start](docs/guide/Quick-start.md) | [Agent commands](docs/guide/agent-commands.md) |
| Cursor IDE protection | [Cursor hooks and sandbox](docs/guide/Cursor-hooks-and-sandbox.md) | [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| Process model | [How it works](docs/guide/How-it-works.md) | [Loop patterns](docs/guide/loop-patterns.md) |
| Enforcement | [Gates](docs/guide/gates.md) | [Gates and guarantees](docs/guide/Gates-and-guarantees.md) |
| Long-running projects | [Memory](docs/guide/Memory.md) | [Brownfield context](docs/guide/brownfield-context.md) |
| Questions | [FAQ](docs/guide/FAQ.md) | [Stability policy](docs/guide/Stability-policy.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## Contributing

We welcome focused improvements — skills, gates, CLI, docs, and tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for layout, gate stability rules, and local checks.

### Use Spec Guardrails to build your contribution

The recommended workflow is to **dogfood the product**: install Spec Guardrails, describe your change through the agent phases, implement against approved artifacts, and verify before opening a PR.

**In your own project or fork** — use the latest stable release from npm:

```bash
npx @luizsantiago/spec-guardrails@latest install
npx @luizsantiago/spec-guardrails doctor
```

Then in chat: `/specify` (or `/elicit` if scope is unclear) → `/tasks` → `/loop` → `/verify`. Your `.specs/` folder holds the spec and proof that guided the change.

**In this source repository** — work against the branch you are developing, not the published tarball:

```bash
git clone https://github.com/luizssantiago92/spec-guardrails.git
cd spec-guardrails
npm install
npm run guardrails -- install
npm run guardrails -- doctor
```

Edit source under `skills/`, `lib/`, `scripts/`, and `rules/`; re-run `npm run guardrails -- install` after skill or gate changes. Run `npm test` before every PR.

| Path | Role |
| --- | --- |
| `skills/` | Hub and sister skills shipped to consumers |
| `skills/references/` | Phase procedures (`specify.md`, `elicit.md`, …) |
| `scripts/` | Deterministic Python gates |
| `test/` | Node install tests and Python gate suites |

Gate changes follow the adversarial test policy in [CONTRIBUTING.md](CONTRIBUTING.md). Credits: [docs/guide/credits.md](docs/guide/credits.md)

---

## License

MIT — see [LICENSE](LICENSE).
