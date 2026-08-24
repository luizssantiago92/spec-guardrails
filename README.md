# Spec Guardrails

[![npm version](https://img.shields.io/npm/v/@luizsantiago/spec-guardrails.svg)](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Keep AI coding agents honest — specify the work, prove each step, verify independently.**

npm: [`@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails) **3.9.x**

---

## What is Spec Guardrails?

**Spec Guardrails** is a **process kit** for AI-assisted software development. It does not replace your app, framework, or tests. It gives your agent a repeatable way to work:

1. **Write down the goal** before coding (`spec.md`)
2. **Break work into small jobs** (`tasks.md`)
3. **Implement in waves** with real checks
4. **Verify with fresh eyes** — proof, not “trust me”

Everything important lives in **`.specs/`** in your repo so the project remembers decisions across chats and teammates.

**You** approve specs and tasks. **The agent** follows phase guides and runs checks. **Gates** (optional Python scripts) can **stop** the workflow when paperwork or evidence is missing.

> **Plain-language guide:** [Overview](docs/guide/Overview.md) · [How it works](docs/guide/How-it-works.md) · [Quick start](docs/guide/Quick-start.md)

---

## What it is not

- Not a code generator or a new framework
- Not a vector database or “AI memory” that reads your whole codebase
- Not automatic push/merge/deploy — you stay in control of git tiers
- Not a replacement for code review or product judgment

---

## Install (once per project)

```bash
npx @luizsantiago/spec-guardrails install
```

| Requirement | Purpose |
| --- | --- |
| **Node.js 18+** | Required — CLI and install |
| **Python 3.10+** | Optional — enables **Brakes mode** (automatic gates). Without Python you still get the full workflow in **Process mode** |

Re-run `install` after upgrading the package. Your `.specs/` notes and `STATE.md` are kept.

Check readiness: `npx @luizsantiago/spec-guardrails doctor`

Works with **Cursor, Claude Code, GitHub Copilot, OpenAI Codex**, and other agents via root `AGENTS.md`. See [Platform parity](docs/guide/Platform-parity.md).

---

## How you use it day to day

You talk to the agent in **chat**, not the terminal. These are **agent commands** (phrases the agent understands):

| Command | When to use |
| --- | --- |
| `/specify` | Start a real feature — written requirements first |
| `/tasks` | Shopping list of jobs after you approve the spec |
| `/loop` | Implement — one wave at a time |
| `/verify` | Proof after the last job — use a **fresh** chat when possible |
| `/quick` | Tiny fix only (≤3 files, no big design decisions) |

**Typical path:** `/specify` → approve → `/tasks` → approve → `/loop` → `/verify` → `/archive`

You do **not** need to memorize CLI commands. The agent runs gates and helpers for you when **Brakes mode** is available.

**Full command reference:** [Agent commands](docs/guide/agent-commands.md)

---

## Two modes (same product)

| Mode | You need | What changes |
| --- | --- | --- |
| **Process** | Node only | Full workflow + `.specs/` memory + phase skills |
| **Brakes** | Node + Python | Same + scripts that **exit non-zero** when specs, tasks, or evidence are incomplete |

Both are intentional. Add Python when you want automatic stop signs, not just checklists.

Details: [FAQ → Process vs Brakes](docs/guide/FAQ.md#process-vs-brakes)

---

## What lands in your repo

| Path | Role |
| --- | --- |
| `.cursor/skills/` (and Claude, Copilot, Codex trees) | Instructions the agent reads per phase |
| `.specs/STATE.md` | Where you are — active feature, next step |
| `.specs/features/NNN-slug/` | Spec, tasks, validation for each feature |
| `.specs/guardrails/scripts/` | Python gates (Brakes mode) |
| `.specs/config.yaml` | Optional project rules and policy |

---

## Optional capabilities (use when you need them)

Most projects start with Specify → Tasks → Loop → Verify only. Turn these on when the work warrants it:

| Capability | Plain purpose | Learn more |
| --- | --- | --- |
| **Memory search** | Find text in past specs and validations | [Memory guide](docs/guide/Memory.md) |
| **Context guards** | Check scope before edit or “done” | [Agent commands](docs/guide/agent-commands.md) · **Cursor:** auto via hooks |
| **Episodic memory** | Session notes → episodic → lessons | [Memory → Episodes](docs/guide/Memory.md#episodic-memory-lifecycle) |
| **Code index** | Lightweight brownfield file/symbol map | [Brownfield context](docs/guide/brownfield-context.md) |
| **Sandbox policy** | Block/warn destructive shell commands | [Overview → Safety](docs/guide/Overview.md#safety-and-limits) |
| **Execution policy** | Limit paths, retries, dangerous ops | [Overview → Safety](docs/guide/Overview.md#safety-and-limits) |
| **Solution exploration** | Compare two+ implementations before committing | [Overview → Exploration](docs/guide/Overview.md#optional-exploration-mode) |
| **Semantic retrieval** | Search by meaning (needs OpenAI or Ollama) | [Memory → Semantic](docs/guide/Memory.md#semantic-search-optional) |

**Default:** semantic search is **off**. FTS + graph search work without any API.

---

## Documentation

| Start here | Best for |
| --- | --- |
| **[Overview](docs/guide/Overview.md)** | Complete simple picture — workflow, layers, team use |
| [Quick start](docs/guide/Quick-start.md) | First ten minutes |
| [How it works](docs/guide/How-it-works.md) | Story from idea to archive |
| [Memory](docs/guide/Memory.md) | `.specs/` memory and search — when and how much |
| [FAQ](docs/guide/FAQ.md) | Common questions |

| Go deeper | Best for |
| --- | --- |
| [Agent commands](docs/guide/agent-commands.md) | Every `/specify`, `/loop`, CLI helper |
| [Guarantees matrix](docs/guide/Guarantees-matrix.md) | Product promises → mechanisms |
| [Gates](docs/guide/gates.md) | What each gate checks |
| [Architecture](docs/guide/Architecture.md) | Core vs platform adapters |
| [Concepts](docs/guide/concepts.md) | Spec-driven, loop, graph, tiers |
| [Changelog](docs/CHANGELOG.md) | Version history |

Doc index: [docs/guide/README.md](docs/guide/README.md)

---

## Upgrading

```bash
npx @luizsantiago/spec-guardrails install
```

See [CHANGELOG](docs/CHANGELOG.md) for release notes.

---

## Contributing · Credits · License

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [Credits](docs/guide/credits.md)
- MIT — see [LICENSE](LICENSE)
