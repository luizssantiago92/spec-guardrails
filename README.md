# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Keep AI coding agents honest — specify the work, prove each step, verify independently.**

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **4.0.x**

---

## What is Spec Guardrails?

A **process kit** for AI-assisted development — not your app, framework, or a vector database. It gives agents a repeatable path: **write the goal → plan jobs → implement in waves → verify with proof**. State lives in **`.specs/`** so decisions survive across chats.

You approve specs and tasks; the agent follows phase guides and runs checks. Full picture: **[Overview](docs/guide/Overview.md)**.

---

## Install

```bash
npx @luizsantiago/spec-guardrails install
```

Re-run after upgrading the package (your `.specs/` notes are kept). Check readiness: `doctor`. Works with **Cursor, Claude Code, GitHub Copilot, Codex**, and other agents via root `AGENTS.md` — see [Platform parity](docs/guide/Platform-parity.md).

| Requirement | Purpose |
| --- | --- |
| **Node.js 18+** | Required — CLI and install |
| **Python 3.10+** | Optional — enables **Brakes mode** (automatic gates). Without it: full **Process mode** workflow |

Details: [Process vs Brakes](docs/guide/FAQ.md#process-vs-brakes) · [CHANGELOG](docs/CHANGELOG.md)

---

## Day to day (chat, not terminal)

| Command | When to use |
| --- | --- |
| `/specify` | Start a feature — written requirements first |
| `/elicit` | Optional — structured Q&A when kickoff or request is vague |
| `/tasks` | Job list after you approve the spec |
| `/loop` | Implement — one wave at a time |
| `/verify` | Proof after the last job — fresh chat when possible |
| `/quick` | Tiny fix only (≤3 files, no big design decisions) |

**Typical path:** `/specify` → approve → `/tasks` → approve → `/loop` → `/verify` → `/archive`

The agent runs gates and helpers for you when Python is available. Reference: [Agent commands](docs/guide/agent-commands.md).

---

## What lands in your repo

| Path | Role |
| --- | --- |
| `.cursor/skills/` (+ Claude, Copilot, Codex trees) | Phase instructions for the agent |
| `.specs/STATE.md` | Active feature and next step |
| `.specs/features/NNN-slug/` | Spec, tasks, validation per feature |
| `.specs/guardrails/scripts/` | Python gates (Brakes mode) |
| `.specs/config.yaml` | Optional project rules and policy |

---

## Optional capabilities

Turn on when the work warrants it — most projects start with Specify → Tasks → Loop → Verify only.

| Capability | Purpose |
| --- | --- |
| Memory search | Find text in past specs and validations |
| Context guards | Scope check before edit or “done” (Cursor: auto via hooks) |
| Episodic memory | Session notes → episodic → lessons |
| Code index | Lightweight brownfield file/symbol map |
| Sandbox / execution policy | Warn or block destructive shell commands and path drift |
| Solution exploration | Compare implementations before committing |
| Semantic retrieval | Search by meaning (OpenAI or Ollama; **off** by default) |

Guides: [Memory](docs/guide/Memory.md) · [Brownfield context](docs/guide/brownfield-context.md) · [Overview → Safety & exploration](docs/guide/Overview.md)

---

## Documentation

| Start here | Go deeper |
| --- | --- |
| [Overview](docs/guide/Overview.md) | [Agent commands](docs/guide/agent-commands.md) |
| [Quick start](docs/guide/Quick-start.md) | [Guarantees matrix](docs/guide/Guarantees-matrix.md) |
| [How it works](docs/guide/How-it-works.md) | [Gates](docs/guide/gates.md) |
| [Memory](docs/guide/Memory.md) | [Architecture](docs/guide/Architecture.md) |
| [FAQ](docs/guide/FAQ.md) | [Concepts](docs/guide/concepts.md) |

Full index: [docs/guide/README.md](docs/guide/README.md)

---

## Contributing · Credits · License

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [Credits](docs/guide/credits.md)
- MIT — see [LICENSE](LICENSE)
