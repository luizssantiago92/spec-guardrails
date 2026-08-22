# Spec Guardrails

**Keep AI coding agents honest — specify the work, prove each step, verify independently.**

Agents are great at writing code and terrible at knowing when to stop. Spec Guardrails gives them a repeatable loop: agree on the goal in writing, break it into checkable tasks, prove each step, and let a fresh review ask for proof — not “trust me”.

| | |
| --- | --- |
| **Problem** | Agents ship “looks good” with thin specs, missing evidence, and the same context that wrote the code declaring victory. |
| **Solution** | One kit, two modes: **Process** (Node) for a flexible workflow; **Brakes** (Node + Python gates) for the **full product** with structural guarantees enforced automatically. |
| **Result** | Traceable `.specs/` memory, fewer fake finishes, cheaper turns (~70% less skill text on planning). Add Python when you want gates — the reason many teams install Spec Guardrails. |

With **Brakes** on, incomplete write-ups or missing test evidence **fail a Python gate** before the feature is called done. **Process** mode keeps the same phases without exit-code enforcement — a deliberate choice for lighter work.

Works with **any repo-local AI agent** — Cursor and Claude Code adapters ship first; the core is not locked to those products. See [Architecture](Architecture.md).

## Operating modes

| Mode | Runtime | What you get | Best for |
| --- | --- | --- | --- |
| **Process** | Node.js 18+ | Workflow, `.specs/` memory, progressive loading, independent `/verify` | Flexible ceremony |
| **Brakes** | Node + Python 3.10+ | Process **plus** Python gates from the [Guarantees matrix](Guarantees-matrix.md) | Full rigor — gates stay Python by design |

## Install

    npx @luizsantiago/spec-guardrails install

Re-run anytime to refresh the playbook. Your notes and decisions in `.specs/` stay put.

After install, `npx @luizsantiago/spec-guardrails doctor` scores readiness and shows Process vs Brakes.

## Why people use it

1. **Only as deep as the work needs** — Process for light work; Brakes when guarantees must fire  
2. **Guarantees you can name** — intent, traceability, evidence, commits — [Guarantees matrix](Guarantees-matrix.md); **Python gates enforce them in Brakes mode**  
3. **Cheaper chats** — the agent opens **this step’s guide**, not the whole manual (~70% less skill text on a planning turn)  
4. **Someone else checks the homework** — independent `/verify`, not the same context that wrote the code  
5. **Any agent environment** — core + CLI are not Cursor-only; see [Architecture](Architecture.md)  
6. **Clearer asks** — sharp goals, a small job list, a “may I commit?” pause before each check-in  
7. **Optional polish** — security, QA, simplify, ship — one sister skill at a time when you ask  

## Everyday brakes (Brakes mode)

```bash
npx @luizsantiago/spec-guardrails validate-spec auth
npx @luizsantiago/spec-guardrails check-commit --message "feat(auth): add token refresh"
npx @luizsantiago/spec-guardrails lessons list --status confirmed
```

Requires Python 3.10+. Plain meaning: [Guarantees matrix](Guarantees-matrix.md) · [Gates and guarantees](Gates-and-guarantees.md) · [Quick start](Quick-start.md)

## Agent commands

You talk to the agent in **chat**, not the terminal — `/specify`, `/loop`, `/verify`, and more.

| Command | When |
| --- | --- |
| `/quick` | Tiny change (≤3 files, no new deps) — light path |
| `/specify` | Start any real feature |
| `/tasks` | Job list after spec approval |
| `/loop` | Implement (`loop-plan` each wave) |
| `/verify` | Proof after last task |

**Full reference:** [agent-commands.md](agent-commands.md) · [Concepts](concepts.md)

## Start here

| Page | Read when |
| --- | --- |
| [Guarantees matrix](Guarantees-matrix.md) | You want the product promises (and why Python matters) |
| [Architecture](Architecture.md) | Core vs adapters — any AI agent, not just Cursor |
| [How it works](How-it-works.md) | Story from goal → done |
| [Gates and guarantees](Gates-and-guarantees.md) | Freeze policy + honest limits |
| [Quick start](Quick-start.md) | First ten minutes |
| [FAQ](FAQ.md) | Process vs Brakes, which agents, why Python gates |

## Links

- [README](https://github.com/luizssantiago92/spec-guardrails#readme) (technical detail)
- [npm `@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
