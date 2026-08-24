# Spec Guardrails

**Keep AI coding agents honest — specify the work, prove each step, verify independently.**

Agents write code fast and call “done” too early. Spec Guardrails gives them a simple contract: **write the goal → break into jobs → prove each step → verify with fresh eyes**.

| | |
| --- | --- |
| **Problem** | Thin specs, missing evidence, same chat declaring victory |
| **Solution** | Process kit: `.specs/` memory + phase guides + optional Python gates |
| **You do** | Approve specs/tasks; approve push/merge when ready |
| **Agent does** | Follow phases; run checks in Brakes mode |

Works with **Cursor, Claude Code, Copilot, Codex**, and other agents. See [Platform parity](Platform-parity.md).

---

## Start here

| Read first | Why |
| --- | --- |
| **[Overview](Overview.md)** | Full simple picture — what it is, how much to use |
| [Quick start](Quick-start.md) | Ten minutes from install to first spec |
| [How it works](How-it-works.md) | Story from idea to archive |
| [Memory](Memory.md) | `.specs/` memory and search — when and how much |

---

## Install

```bash
npx @luizsantiago/spec-guardrails install
```

Optional: `npx @luizsantiago/spec-guardrails doctor`

**Node 18+** required. **Python 3.10+** enables automatic gates (Brakes mode).

---

## Daily use (chat)

| Command | When |
| --- | --- |
| `/specify` | Start a feature |
| `/tasks` | Job list after spec approval |
| `/loop` | Implement |
| `/verify` | Proof when jobs are done |
| `/quick` | Tiny change only |

Full list: [Agent commands](agent-commands.md)

---

## Two modes

| Mode | Needs | Gates auto-block? |
| --- | --- | --- |
| **Process** | Node | No — checklist in skills |
| **Brakes** | Node + Python | Yes |

[FAQ → Process vs Brakes](FAQ.md#process-vs-brakes)

---

## Go deeper

| Topic | Doc |
| --- | --- |
| Product promises | [Guarantees matrix](Guarantees-matrix.md) |
| Every gate | [Gates](gates.md) |
| Architecture | [Architecture](Architecture.md) |
| FAQ | [FAQ](FAQ.md) |
| npm README | [GitHub README](https://github.com/luizssantiago92/spec-guardrails#readme) |

Doc index: [README.md](README.md) (this folder)
