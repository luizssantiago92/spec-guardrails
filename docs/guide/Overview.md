# Overview — Spec Guardrails in plain language

This page explains **what Spec Guardrails is**, **how you use it**, and **how much ceremony you need** — without drowning in CLI names. For depth, follow the links at the end of each section.

---

## Definition

**Spec Guardrails** is a **spec-driven process kit** for AI coding agents. It installs:

- **Phase guides** (skills) the agent reads one step at a time
- **Project memory** (`.specs/`) that survives chat sessions
- **Optional automatic checks** (Python gates) that block incomplete work

It answers one problem: agents jump to code, say “done”, and leave thin specs and missing proof. Spec Guardrails makes **write → plan → build → prove** the default path.

**It is not your application.** Your stack, languages, and tests stay yours.

---

## The core loop (what always applies)

```text
Specify     →  agree WHAT in writing (spec.md)
Tasks       →  break into small jobs (tasks.md) — skip for tiny work
Execute     →  implement in waves (/loop)
Verify      →  independent proof (validation.md)
Archive     →  fold into project memory
```

**You approve** the spec and tasks. **The agent implements** and runs checks. **You approve** push, PR, and merge separately (git tiers).

Full story: [How it works](How-it-works.md)

---

## How you interact (chat vs terminal)

### Chat — your main interface

Use **agent commands** in Cursor (or your agent’s chat):

| Command | Use when |
| --- | --- |
| `/specify` | Starting any non-trivial feature |
| `/tasks` | You approved the spec and need a job list |
| `/loop` | Implementation time |
| `/verify` | All jobs done — ask for proof |
| `/quick` | ≤3 files, no new dependencies, no design fork |
| `/explore` | Idea still fuzzy — no spec yet |

Reference: [Agent commands](agent-commands.md)

### Terminal — occasional

Humans usually run:

| Command | When |
| --- | --- |
| `install` | Once, or after package upgrade |
| `doctor` | Install looks broken, or you want Process vs Brakes score |
| `project-init` | Brownfield repo — optional map into `.specs/` |

Agents run most other CLI helpers (gates, `loop-plan`, memory rebuild) during phases — you do not need to memorize them.

---

## How much ceremony? (feature size)

The agent picks depth from scope — you can override.

| Size | Example | Typical path |
| --- | --- | --- |
| **Quick** | Fix label, one file | `/quick` → verify → commit |
| **Simple** | Small localized change | `/specify` → `/loop` → `/verify` |
| **Medium** | New feature, &lt;10 tasks | `/specify` → `/tasks` → `/loop` → `/verify` |
| **Complex** | New API, architecture | + `/discuss`, `/design` |
| **Parallel** | Many tasks, disjoint files | + task graph, optional worktrees |

Rules: [Concepts → Complexity tiers](concepts.md#complexity-tiers--how-the-agent-chooses-depth)

**Rule of thumb:** if you would not write a one-paragraph goal for it, use `/quick`. If you would not trust an intern without a written spec, use `/specify`.

---

## What’s in your repo after install

Think of four layers — **only the first two are mandatory** for daily use:

### 1. Skills (instructions for the agent)

Installed under `.cursor/skills/`, `.github/skills/`, etc.

- **Hub** — map and rules (`agent-architecture.md`)
- **References** — one file per phase (`specify.md`, `implement.md`, …)
- **Sister skills** — security, task-graph, … loaded on demand

The agent loads **one phase at a time** to save tokens. Details: [Skills and hub](skills-and-hub.md)

### 2. `.specs/` (project memory — source of truth)

| File / folder | Purpose |
| --- | --- |
| `STATE.md` | Active feature, phase, **one** next step |
| `features/NNN-slug/spec.md` | Requirements |
| `features/NNN-slug/tasks.md` | Jobs |
| `features/NNN-slug/validation.md` | Verify report |
| `lessons.json` | Failures that became rules |
| `config.yaml` | Optional team rules and policy |

Markdown here is **authoritative**. If chat and `.specs/` disagree, fix `.specs/`.

Handoff rules: [Memory skill](../../skills/references/memory.md) (installed copy in your agent tree)

### 3. Gates (optional automatic checks — Brakes mode)

Python scripts in `.specs/guardrails/scripts/`. **Exit ≠ 0 means stop and fix.**

Examples: incomplete spec, tasks not tracing to requirements, “done” without test evidence.

You do not run these manually every day — the agent runs them at phase boundaries.

Reference: [Gates](gates.md) · [Guarantees matrix](Guarantees-matrix.md)

### 4. CLI helpers (optional power tools)

Memory search, execution policy, worktrees, solution exploration — **use when the work needs them**, not on day one.

---

## Process vs Brakes

| | Process | Brakes |
| --- | --- | --- |
| **Needs** | Node 18+ | Node + Python 3.10+ |
| **Workflow** | Yes | Yes |
| **Gates auto-block** | No — agent follows checklist | Yes — scripts exit non-zero |
| **Best for** | Light teams, learning the loop | Teams that want enforced paperwork |

Run `doctor` to see your mode. FAQ: [Process vs Brakes](FAQ.md#process-vs-brakes)

---

## Memory and search

**Memory = `.specs/` markdown.** The agent (or you) writes specs, validation, lessons. That is what persists.

**Search = optional index** (`memory.db`) rebuilt from those files — like a book index, not a second truth.

| Need | Tool |
| --- | --- |
| “What’s connected to task T1?” | `memory-query --from T1` |
| “Find the word OAuth in artifacts” | `memory-search "OAuth"` |
| “Package of context about X” | `memory-retrieve "…"` |

**When to rebuild:** after you change specs, validation, exploration, or approved lessons.

**Semantic (meaning-based) search:** off by default; needs OpenAI or Ollama only if FTS is not enough.

Full guide: **[Memory](Memory.md)** — no project required to understand the model.

---

## Safety and limits

**Execution policy** (optional `.specs/config.yaml`) soft-enforces:

- which paths the agent may touch
- retry and run budgets
- read / write / delete rules (e.g. deny DELETE under `.git/`)

**Context guards** check before edit or before claiming “feature done” (active feature, task files, validation PASS).

**Cursor hooks (3.8+):** `install` adds `.cursor/hooks/` so `context-guard check-edit` runs automatically before write/edit tools — you still approve specs/tasks; the IDE blocks out-of-scope edits without the agent remembering to call the CLI.

These reduce blast radius; they do not replace your review.

---

## Optional: exploration mode

When **two or more valid architectures** fit the same approved spec, use **solution exploration** — not ordinary `/loop`.

Creates `exploration.md`, isolated worktrees per candidate, comparison matrix, then a recorded decision.

Only for real forks. Reference: installed `solution-exploration.md` · [Agent commands](agent-commands.md)

---

## Team workflow (Cursor + Spec Guardrails)

1. **One feature folder** per change (`001-auth`, …)
2. **`STATE.md`** updated at session end — next person knows where to resume
3. **Approve spec/tasks** in PR or chat before big `/loop` runs
4. **Verify in fresh context** when possible — not the same thread that wrote the code
5. **FAIL → lesson** — grounded in `validation.md`, promoted over time
6. **Memory rebuild** after major `.specs/` changes if you use search

Semantic search is **optional** — useful with **lots** of archived features and vocabulary drift, not for brand-new repos.

---

## What Spec Guardrails does not guarantee

- Perfect code on first try
- Catching every security bug without `/verify` extras
- Replacing human product decisions
- Indexing your entire `src/` tree (memory is **governance artifacts**, not all code)

---

## Where to go next

| I want to… | Read |
| --- | --- |
| Install and try in 10 minutes | [Quick start](Quick-start.md) |
| Understand memory and search | [Memory](Memory.md) |
| See every chat command | [Agent commands](agent-commands.md) |
| See product promises | [Guarantees matrix](Guarantees-matrix.md) |
| Questions | [FAQ](FAQ.md) |
| Technical README | [../../README.md](../../README.md) |

Back to [Home](Home.md)
