# FAQ

## What is this package, in plain language?

A **spec-driven process kit for AI coding agents**. It makes them write down the goal, build against that plan, and prove the work before calling it done — so you get fewer half-finished “looks good” moments. **Spec Guardrails** is the name of the kit; **gates** are the structural brakes that exit non-zero when paperwork or evidence is missing.

## Guardrails vs gates?

**Spec Guardrails** = the spec-driven process kit (skills, `.specs/` memory, phases, CLI). **Gates** = Python scripts that **block** incomplete specs, tasks, or evidence — exit ≠ 0 → stop and fix. The product name uses “guardrails” for the whole kit; the enforcement layer is hard brakes, not soft platform rails.

## Do I need Python?

**Node.js 18+** runs install and the CLI (always). **Python 3.10+** activates **Brakes mode** — the **full** Spec Guardrails with automatic Python gates. Without Python you stay in **Process mode**: same phases and checklists, no exit-code enforcement. Run `doctor` to see which mode you are in.

## Why are gates Python?

**By design.** Brakes mode is the complete product: deterministic structural gates under `.specs/guardrails/scripts/*.py`, locked by the adversarial CI matrix. Node runs install and CLI; Python runs enforcement. We are **not** porting gates to Node — Process mode is the flexible Node-only path; Python is how the guarantees fire.

## Process vs Brakes?

| Mode | Runtime | Best for |
| --- | --- | --- |
| **Process** | Node only | Flexible ceremony — workflow, `.specs/` memory, progressive loading, independent `/verify` |
| **Brakes** | Node + Python | **Full kit** — same loop plus Python gates that exit non-zero when paperwork or evidence is incomplete |

Both are intentional product modes. See [Guarantees matrix](Guarantees-matrix.md).

## Which AI agents are supported?

**Any** agent that reads repo instructions, edits files, and can run shell commands can use the **core** (`.specs/`, hub content, CLI, Python gates in Brakes mode).

**Install** ships **adapters** for **Cursor, Claude Code, GitHub Copilot, and OpenAI Codex** (skills trees + always-on entry files), plus root `AGENTS.md` for other agents. See [Platform parity](Platform-parity.md).

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

## What are Cursor hooks and why do I see extra Node processes?

**Optional Cursor-only feature — off by default.** Hooks auto-run scope checks before edits and shell policy before terminal commands **only after you opt in**:

```bash
npx @luizsantiago/spec-guardrails install --with-cursor-hooks
```

`/elicit` may ask once whether to enable them. You can also say "enable Cursor hooks" or "disable Cursor hooks" in chat.

When enabled, you may notice hook activity or many short-lived `node.exe` processes on busy sessions (especially on Windows). That is expected. Hooks are **soft governance**, not an OS container.

Full guide: **[Cursor hooks and sandbox](Cursor-hooks-and-sandbox.md)** — enable/disable, modes, tuning.

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

1. **[Overview](Overview.md)** — complete simple picture  
2. [Quick start](Quick-start.md)  
3. [How it works](How-it-works.md)  
4. [Memory](Memory.md) — if you care about search or team handoff  

Then [Guarantees matrix](Guarantees-matrix.md) / [Gates](gates.md) when you need enforcement detail.

## Does `doctor` tell me when to use memory or semantic search?

**Partially.** Since 3.7.0, `doctor` may print a **Memory hint** when the index is missing, stale, or semantic is on without enough embeddings. It does **not** enable semantic search for you.

For memory: see **[Memory](Memory.md)** — rebuild after `.specs/` artifact changes; semantic stays **off** until FTS is not enough and you have OpenAI or Ollama.

## What is semantic search and do I need it?

**Optional.** Default is **off**. It helps find past specs/lessons when **words differ** but meaning is similar. It needs **OpenAI or Ollama** for embeddings. It does **not** prevent coding errors — it helps **find old context**.

Most teams use `memory-search` / `memory-retrieve` without semantic first. Details: [Memory → Semantic](Memory.md#semantic-search-optional).

## Something looks wrong after install?

Run `npx @luizsantiago/spec-guardrails doctor` — it scores the install (skills, gates, config, STATE) and suggests the next CLI step (`loop-plan`, `init-config`, …).

## Something broken or unclear?

- **Bugs / frozen-gate regressions:** open an issue on [GitHub Issues](https://github.com/luizssantiago92/spec-guardrails/issues).
- **How-do-I questions:** [GitHub Discussions (Q&A)](https://github.com/luizssantiago92/spec-guardrails/discussions) — keep the FAQ honest; Discussions is for community answers, not marketing.
- Contributing rules (especially the frozen gate): [CONTRIBUTING](../../CONTRIBUTING.md).
