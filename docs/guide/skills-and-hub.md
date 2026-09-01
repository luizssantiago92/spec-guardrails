# Skills and hub — what install copies

After `install`, the agent does **not** load the whole library every turn. It loads a **working set**: the hub, one phase reference, and optionally one sister skill.

## Architecture overview

| Always on | One at a time | On demand |
| --- | --- | --- |
| `agent-architecture.md` (hub) | One file from `references/` | Sister skills |
| `engineering-baseline.mdc` (Cursor rule) | e.g. `specify.md`, `implement.md` | e.g. `security-review.md`, `task-graph-engineering.md` |

**Load order each turn:** Hub → one reference → optional sister → gate at the boundary.

## Hub — `agent-architecture.md`

| Responsibility | Detail |
| --- | --- |
| **Contract** | Test-first, gate-before-done, author ≠ verifier, git tiers |
| **Phase map** | Which reference to open for Specify, Tasks, Loop, Verify, … |
| **Complexity router** | Quick / Simple / Medium / Complex / Parallel — how deep to go |
| **Gate schedule** | When to run each Python script |
| **Memory map** | What belongs under `.specs/` |

The hub is the **map**. It does not replace phase procedures — the agent still reads the full reference for the current phase.

## Phase references (`references/`)

Loaded **one per turn** (plus hub). Each file is a step-by-step procedure.

| Reference | Agent command | Phase |
| --- | --- | --- |
| `explore.md` | `/explore` | Research — no feature folder yet |
| `elicitation.md` | `/elicit` | Requirements brief before Specify |
| `solution-exploration.md` | `/solution-explore` | Explicit design fork (CLI + artifact) |
| `constitution.md` | `/constitution` | Once — project principles |
| `project-init.md` | `/project-init` | Brownfield repo map |
| `specify.md` | `/specify` | Written requirements |
| `discuss.md` | `/discuss` | Gray product decisions |
| `design.md` | `/plan` | Technical design |
| `tasks.md` | `/tasks` | Atomic job list |
| `analyze.md` | `/analyze` | Spec ↔ tasks consistency |
| `implement.md` | `/loop` | Execute waves + `loop-plan` |
| `validate.md` | `/verify` | Independent proof |
| `archive.md` | `/archive` | Fold into domain memory |
| `converge.md` | `/converge` | Recover from drift |
| `memory.md` | `/handoff` | Session snapshot |
| `quick-mode.md` | `/quick` | Tiny fix lane |
| `context-limits.md` | (load rule) | Token / context discipline |
| `lessons.md` | `/lessons` | Learn from verify failures |
| `sub-agents.md` | (with `/loop`) | Parallel dispatch protocol |

## Sister skills (cross-cutting)

| Skill | When loaded | What it does |
| --- | --- | --- |
| `engineering-standards.md` | Execute | Secure coding, commits, artifact language |
| `task-graph-engineering.md` | 3+ tasks, `/task-graph`, parallel `/loop` | DAG rules, file ownership, merge owner |
| `security-review.md` | Verify | OWASP-style checklist |
| `git-handoff.md` | Handoff, archive | Commit `.specs/`, session continuity |
| `appsec.md` | **Conditional** — Complex or attack surface | Deeper security pass — **one at a time** |
| `qa-strategy.md` | **Conditional** — multi-step UI or owner ask | QA focus — after AppSec if both apply |
| `code-simplify.md` | **Conditional** — Medium+ or owner ask | Refactor without behavior change |
| `ship-ready.md` | **Conditional** — owner asks to ship | Pre-release checklist — never auto-push |
| `python-devops.md` | **Conditional** — infra/docker/terraform/helm/CI paths in tasks, or `python-platform` preset | Ship Surface in `design.md` — load during Design/Tasks/Execute, not with AppSec/QA |
| `ai-engineering.md` | **Conditional** — LLM/RAG/MCP/agent/prompt paths, or classify-change AI signal | AI Surface in `design.md` — same loading rules as `python-devops` |

**Conditional rule:** load **at most one** conditional sister at a time for Verify extras (AppSec, QA). Sequence: AppSec → drop → QA → drop. Platform sisters (`python-devops`, `ai-engineering`) load during Design/Tasks/Execute when paths match — never together with AppSec/QA in the same window.

**Install set:** hub + **10** sister skills + **19** phase references — see [README](https://github.com/luizssantiago92/spec-guardrails#spec-driven-development-sdd) and [Skills and hub](skills-and-hub.md) (this page).

## Always-on project rule

`engineering-baseline.mdc` in `.cursor/rules/` points Cursor at the hub and lists installed skills/gates. Re-run `install` to refresh maps without losing your prose.

## Progressive loading (why tokens stay low)

| Step | Who | Action |
| ---: | --- | --- |
| 1 | You | `/specify` + feature description |
| 2 | Agent | Read hub (contract + router) |
| 3 | Agent | Read `specify.md` only (~9k tokens this turn) |
| 4 | Agent | Run `validate-spec` |
| 5 | Agent | Present `spec.md` → wait for your approval |

Dumping every skill + reference every turn ≈ **31k tokens** — see [Token efficiency](Token-efficiency.md).

## Where files land after install

By default, `install` detects your agent platform and writes skills to **one tree** (Cursor when nothing is detected). Use `--all-platforms` for every tree, or `--platform cursor|claude|copilot|codex` to force one.

Existing skill trees are **preserved** when you switch IDEs — re-run `install` to refresh them without losing prior platforms.

| Path | Contents |
| --- | --- |
| `.cursor/skills/agent-architecture.md` | Hub (Cursor) |
| `.claude/skills/` | Same tree (Claude Code) |
| `.github/skills/` | Same tree (GitHub Copilot) |
| `.codex/skills/` | Same tree (OpenAI Codex) |
| `*/skills/references/*.md` | Phase procedures |
| `*/skills/*.md` | Sister skills |
| `.cursor/rules/engineering-baseline.mdc` | Cursor always-on rule |
| `.specs/guardrails/scripts/` | Python gate scripts |
| Root `AGENTS.md` | Open-standard entry for agent-agnostic tools |

## Related

- [Agent commands](agent-commands.md) — chat phrases per phase
- [Gates reference](gates.md) — scripts the hub schedules
- [Concepts](concepts.md) — spec-driven + loop + graph
