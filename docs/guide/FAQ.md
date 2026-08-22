# FAQ

## What is this package, in plain language?

A **spec-driven process kit for AI coding agents**. It makes them write down the goal, build against that plan, and prove the work before calling it done — so you get fewer half-finished “looks good” moments. **Spec Guardrails** is the name of the kit; **gates** are the structural brakes that exit non-zero when paperwork or evidence is missing.

## Guardrails vs gates?

**Spec Guardrails** = the repo-local process (skills, `.specs/` memory, phases, CLI). **Gates** = Python scripts that **block** incomplete specs, tasks, or evidence — exit ≠ 0 → stop and fix. The product name uses “guardrails” for the whole kit; the enforcement layer is hard brakes, not soft platform rails.

## Do I need Python?

**Node.js 18+** is required (CLI and `install`). **Python 3.10+** activates **Brakes mode** — without it you stay in **Process mode**: same phases and checklists, no exit-code enforcement. Run `npx @luizsantiago/spec-guardrails doctor` to see the banner when Python is missing.

## Process vs Brakes?

| Mode | Runtime | Best for |
| --- | --- | --- |
| **Process** | Node only | Flexible ceremony — workflow, `.specs/` memory, progressive loading, independent `/verify` |
| **Brakes** | Node + Python | Structural stop-gates — incomplete specs, tasks, or evidence fail with exit ≠ 0 |

Both are intentional. See [Guarantees matrix](Guarantees-matrix.md) for which promises require Brakes.

## Is this only for Cursor?

No. The **core** (`.specs/`, gates, CLI, hub content) is agent-agnostic. **Adapters** copy skills into platform paths — Cursor and Claude Code today; more planned. See [Architecture](Architecture.md) and [Platform parity](Platform-parity.md).

## Is this a framework or a product I run in production?

It’s a **process kit** for agents (skills + docs + a completion gate). Your app is still your app. Spec Guardrails shapes *how the agent works*, not your runtime stack.

## Do I need to change how my team codes?

You need agents (or humans driving agents) to follow **Specify → … → Verify** and keep plans under `.specs/`. Day-to-day languages and frameworks stay yours.

## What’s the difference between always-on skills and on-demand sisters?

| | Always-on (every install) | Sisters (load on demand) |
|--|---------------------|---------------------|
| Role | Plan → build → prove done | Extra passes: security, QA, simplify, ship |
| When | Hub + core sisters ship with every install | Load only when you ask—and **one at a time** |

## Will this stop every bad AI change?

No. It stops many **incomplete** finishes and empty stubs. Judgment, product taste, and review still matter. Sisters help when you want a deeper look.

## Why not load security and QA every time?

Cost and focus. Most turns don’t need a full audit. When you do, say so and load **one** sister.

## How is this different from Test-Led Coding or Addy’s agent-skills?

| | Spec Guardrails | TLC | Addy-style catalogs |
|--|--------------|-----|---------------------|
| Focus | Spec → prove done | Tests as the spine | Broad SDLC skill set |
| Gate | Stronger on “really finished?” | Different emphasis | Usually lighter formal gate |
| Stance | Standalone guardrails | Inspired / credited | Inspired / credited |

See the README **Credits** section for licenses and links.

## Can I use only part of the kit?

You can emphasize phases, but the **install ships the hub and sister skill files** together. On-demand sisters stay optional to *load*. Loosening the freeze (e.g. dropping Specify) is a major-version decision—not a casual tweak.

## Where do I put my feature plans?

Under **`.specs/`** in the repo (see skill templates after install). That’s the shared memory across chats and teammates.

## Does the gate replace code review?

No. It checks **structure and evidence**. Humans (and sisters) still review quality, security nuance, and product fit.

## What do `validate-spec`, `check-commit`, and `lessons list` do?

| Command | In one line |
| --- | --- |
| `npx @luizsantiago/spec-guardrails validate-spec auth` | Checks that the **auth** feature’s written goal is complete enough to build from |
| `… check-commit --message "feat(auth): …"` | Checks the commit title style before you land a change |
| `… lessons list --status confirmed` | Lists project rules learned from past failures (confirmed only) |

You need Python 3 for these. Without a real `.specs/features/auth` folder, `validate-spec auth` will fail with “no such feature” — that’s expected until you specify one.

## I’m not technical—can I still use this?

Yes at a high level: ask your agent to **install Spec Guardrails**, then to **specify before building** and **verify before done**. Engineers maintain the repo and the gate; you can still insist on the process in plain language.

## Where should I start reading?

1. [Home](Home.md)  
2. [Quick start](Quick-start.md)  
3. [How it works](How-it-works.md)  

Then [Guarantees matrix](Guarantees-matrix.md) / [Gates and guarantees](Gates-and-guarantees.md) / [Token efficiency](Token-efficiency.md) when you care about promises, enforcement, or cost.

## Something looks wrong after install?

Run `npx @luizsantiago/spec-guardrails doctor` — it scores the install (skills, gates, config, STATE) and suggests the next CLI step (`loop-plan`, `init-config`, …).

## Something broken or unclear?

- **Bugs / frozen-gate regressions:** open an issue on [GitHub Issues](https://github.com/luizssantiago92/spec-guardrails/issues).
- **How-do-I questions:** [GitHub Discussions (Q&A)](https://github.com/luizssantiago92/spec-guardrails/discussions) — keep the FAQ honest; Discussions is for community answers, not marketing.
- Contributing rules (especially the frozen gate): [CONTRIBUTING](../../CONTRIBUTING.md).
