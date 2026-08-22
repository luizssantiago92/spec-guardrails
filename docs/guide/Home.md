# Spec Guardrails

**Keep AI coding agents honest — specify the work, prove each step, verify independently.**

Agents are great at writing code and terrible at knowing when to stop. Spec Guardrails gives them a repeatable loop: agree on the goal in writing, break it into checkable tasks, prove each step, and let a fresh review ask for proof — not “trust me”.

| | |
| --- | --- |
| **Problem** | Agents ship “looks good” with thin specs, missing evidence, and the same context that wrote the code declaring victory. |
| **Solution** | A repo-local process kit: Specify → Tasks → Execute waves → Verify with fresh context. **Process mode** (Node) always; **Brakes mode** (+ Python) adds structural stop-gates; you approve specs/tasks. |
| **Result** | Traceable `.specs/` memory, fewer fake finishes, cheaper turns (~70% less skill text on planning), and an explicit stop when evidence is missing (Brakes). |

It is not another pile of prompts. With **Brakes** on, incomplete write-ups or missing test evidence should **fail a gate** before the feature is called done. In **Process** mode (Node only) you keep the same phases and checklists without automatic exit-code enforcement — run `doctor` to see which mode you are in.

Works with **repo-local AI agents** — Cursor and Claude Code adapters ship today. See [Architecture](Architecture.md). Install once; the project remembers where you left off.

## Operating modes

| Mode | Runtime | What you get |
| --- | --- | --- |
| **Process** | Node.js 18+ | Workflow, `.specs/` memory, progressive loading, independent `/verify` |
| **Brakes** | Node + Python 3.10+ | Process **plus** exit-code enforcement on structural gates |

Python activates Brakes by design — flexible Process mode is intentional, not a broken install.

## Install

    npx @luizsantiago/spec-guardrails install

Re-run anytime to refresh the playbook. Your notes and decisions in `.specs/` stay put.

After install, `npx @luizsantiago/spec-guardrails doctor` scores readiness (skills, gates, config) and suggests the next step.

## Why people use it

1. **Only as deep as the work needs** — a typo fix stays light; a big feature gets more ceremony  
2. **Guarantees you can name** — intent, traceability, evidence, commits — see [Guarantees matrix](Guarantees-matrix.md); Brakes enforce the structural rows  
3. **Cheaper chats** — the agent opens **this step’s guide**, not the whole manual (~70% less skill text on a planning turn)  
4. **Someone else checks the homework** — the writer of the code is not the only one who gets to say “done”  
5. **Extra care when risk is high** — short security / QA looks, or a human walkthrough, only when it matters — **one guide at a time**  
6. **Clearer asks** — sharp goals, a small job list, a “may I commit?” pause before each check-in  
7. **Optional polish** — tidy the code without changing behavior, or a ship checklist when you ask — still one guide at a time  

## Everyday brakes (after install)

```bash
npx @luizsantiago/spec-guardrails validate-spec auth
npx @luizsantiago/spec-guardrails check-commit --message "feat(auth): add token refresh"
npx @luizsantiago/spec-guardrails lessons list --status confirmed
```

Plain meaning on [Quick start](Quick-start.md), [Guarantees matrix](Guarantees-matrix.md), and [Gates and guarantees](Gates-and-guarantees.md).

## Agent commands

You talk to the agent in **chat**, not the terminal — `/specify`, `/loop`, `/verify`, and more.

| Command | When |
| --- | --- |
| `/quick` | Tiny change (≤3 files, no new deps) — light path |
| `/specify` | Start any real feature |
| `/tasks` | Job list after spec approval |
| `/loop` | Implement (`loop-plan` each wave) |
| `/verify` | Proof after last task |

**Quick tier:** typos and one-file fixes use `/quick` → verify → commit — not the full Medium ceremony. See [Concepts → Complexity tiers](concepts.md#complexity-tiers--how-the-agent-chooses-depth).

**Full reference:** [agent-commands.md](agent-commands.md) · [Concepts](concepts.md)

## Start here

| Page | Read when |
| --- | --- |
| [Guarantees matrix](Guarantees-matrix.md) | You want the product promises (not just command names) |
| [Architecture](Architecture.md) | Core vs Cursor / Claude adapters |
| [How it works](How-it-works.md) | You want the story from goal → done |
| [Gates and guarantees](Gates-and-guarantees.md) | Maintainer freeze + honest limits |
| [Token efficiency](Token-efficiency.md) | You care about chat cost / context |
| [Quick start](Quick-start.md) | First ten minutes |
| [Agent commands](agent-commands.md) | Full chat command reference |
| [Concepts](concepts.md) | Spec-driven, loop, graph, tiers |
| [FAQ](FAQ.md) | You have a concrete question |

## Links

- [README](https://github.com/luizssantiago92/spec-guardrails#readme) (technical detail)
- [npm `@luizsantiago/spec-guardrails`](https://www.npmjs.com/package/@luizsantiago/spec-guardrails)
- Gate contract for maintainers: [`prd/gate-stability.md`](https://github.com/luizssantiago92/spec-guardrails/blob/main/prd/gate-stability.md)
