# Getting started

You installed the **Spec Guardrails**. You do **not** need to memorize CLI commands.

## What to do now

1. Open your **AI coding agent** in this project (Cursor, Claude Code, GitHub Copilot, OpenAI Codex, or any agent that reads root `AGENTS.md`).
2. Start with **Specify** (an **agent command** — chat, not terminal):

   ```
   /specify

   Add CSV export to the reports page. Users pick a date range.
   Out of scope: PDF export.
   ```

3. Review `.specs/features/…/spec.md` and **approve** before implementation.

**Plain-language guide:** [Overview](https://github.com/luizssantiago92/spec-guardrails/blob/main/docs/guide/Overview.md) · [Memory](https://github.com/luizssantiago92/spec-guardrails/blob/main/docs/guide/Memory.md)

---

## Agent commands (chat — not terminal)

Type these in **chat** in your agent environment. They load phase procedures from the installed skills tree (e.g. `.cursor/skills/references/`, `.github/skills/references/`, `.codex/skills/references/` — use the tree your agent loads). In **Brakes mode**, the agent runs Python gates for you.

| Command | When |
| --- | --- |
| `/specify` | **Start here** — written requirements |
| `/tasks` | Break into jobs after spec approval |
| `/loop` | Implement — agent runs `loop-plan` each wave |
| `/verify` | Fresh-context proof after last task |
| `/quick` | Tiny fix only (≤3 files) |

**Typical order:** `/specify` → `/tasks` → `/analyze` → `/loop` → `/verify` → `/archive`

**Full reference** (every command, examples, CLI): [Agent commands](https://github.com/luizssantiago92/spec-guardrails/blob/main/docs/guide/agent-commands.md)

---

## CLI you might run yourself (terminal)

| Command | When |
| --- | --- |
| `install` | First time or upgrade |
| `project-init` | Brownfield repo (optional) |
| `doctor` | Install looks broken |
| `classify-change` / `feature-status` | Pick a tier or see next step |
| `validate-spec` / `validate-traceability` / `validate-state` | Double-check feature gates |
| `validate-quick` | Double-check a Quick TASK/SUMMARY |

Everything else (`loop-plan`, `validate-tasks`, `check-commit`, …) is normally run **by the agent**.

---

## Where things live

| Path | Purpose |
| --- | --- |
| `*/skills/agent-architecture.md` | Hub — phase map (`.cursor/`, `.claude/`, `.github/`, `.codex/`) |
| Root `AGENTS.md` | Open-standard entry |
| `.specs/STATE.md` | Where you left off |
| `.specs/features/` | One folder per feature |
| `.specs/guardrails/scripts/` | Automatic gates |

More guides: [docs/guide/Home.md](https://github.com/luizssantiago92/spec-guardrails/blob/main/docs/guide/Home.md)
