# Agent commands (chat — not the terminal)

> **New to Spec Guardrails?** Start with [Overview](Overview.md) — this page is the full command reference.

**Agent commands** are phrases you type in **your AI coding agent’s chat** (Cursor, Claude Code, or any environment that loads project skills) — not in your shell.
They tell the agent which **phase procedure** to load from the hub references (e.g. `.cursor/skills/references/` on Cursor).
The agent runs Python gates and CLI helpers (`validate-spec`, `loop-plan`, …) for you when **Brakes mode** (Python) is available.

| Command | Purpose | When to use | How you invoke it |
| --- | --- | --- | --- |
| `/quick` | Tiny fix without full spec | ≤3 files, no new deps, no auth/payments | `/quick` + one-line description |
| `/explore` | Research and compare options | Idea is unclear; no production code yet | `/explore` + question or spike goal |
| `/elicit` | Structured requirements Q&A | Kickoff or request vague; before Specify | `/elicit` + scope (project or feature) |
| `/specify` | Written requirements (`spec.md`) | **Start here** when the goal is already clear | `/specify` + what to build + out of scope |
| `/discuss` | Lock gray product decisions | Auth, payments, ambiguity during Specify | `/discuss` + questions to settle |
| `/plan` | Technical design (`design.md`) | Complex tier — APIs, architecture, new patterns | `/plan` + design questions |
| `/tasks` | Atomic job list (`tasks.md`) | Medium+ after approved spec | `/tasks` + “break into tasks” |
| `/task-graph` | Parallel DAG (`task-graph.md`) | 3+ tasks or parallel work | `/task-graph` + “mark parallel groups” |
| `/analyze` | Spec ↔ tasks consistency | Before you approve `tasks.md` | `/analyze` + “check before I approve” |
| `/loop` | Implement (Execute) | After approved tasks; production code | `/loop` + “run loop-plan, next wave” |
| `/verify` | Independent proof | **Always** after last task (fresh context) | `/verify` + “you did not write this code” |
| `/archive` | Fold feature into domain memory | After Verify **PASS** | `/archive` + domain name |
| `/converge` | Recover from spec/code drift | Mid-build discovery invalidates spec/tasks | `/converge` + what drifted |
| `/handoff` | Session snapshot (`STATE.md`) | End of chat; resume later | `/handoff` + next step |
| `/project-init` | Brownfield repo map | Once, existing codebase | `/project-init` + “scan this repo” |
| `/constitution` | Project principles | Once, greenfield or team onboarding | `/constitution` + principles |
| `/lessons` | Record verify failures | After Verify FAIL — avoid repeat mistakes | `/lessons` + what failed |

**Typical pipeline** (optional steps marked with `?`):

```
/explore? → /elicit? → /specify → /discuss? → /plan? → /tasks? → /task-graph? → /analyze → /loop → /verify → /archive
```

Each section below uses: **Purpose · When · How · What the agent does · CLI · Skip when**.

---

## `/specify` — start every real feature here

| | |
| --- | --- |
| **Type** | Agent command (chat) — loads `references/specify.md` |
| **Purpose** | Agree in writing on **what** to build, assumptions, out of scope, and testable acceptance criteria (`REQ-001`, …) in `spec.md` |
| **When** | First step for any feature bigger than a quick fix; before Tasks or Execute |
| **How** | Paste in chat — slash form or plain language (see example) |

**Chat example:**

```
/specify

Add CSV export to the reports page. Users pick a date range.
Out of scope: PDF export and scheduled emails.
```

**What the agent does:**

1. Runs `feature-init` (creates folder, branch, `STATE.md`) — Medium+ work
2. Drafts `spec.md` with requirements and testable criteria
3. Runs `validate-spec` and fixes until the gate passes
4. **Stops and asks you to approve** before Tasks or Execute

**CLI (agent runs — optional for you):**

| Command | Role in Specify |
| --- | --- |
| `feature-init "description"` | Creates `.specs/features/001-slug/`, updates `STATE.md`, branch `feat/001-slug` |
| `validate-spec [feature]` | Gate: spec is complete and testable — **must pass before you approve** |
| `phase-context specify` | Prints project rules from `.specs/config.yaml` for this phase |

**Skip when:** Quick tier only (≤3 files) — use `/quick` instead.

---

## `/quick` — tiny changes only (≤3 files)

| | |
| --- | --- |
| **Purpose** | Bug fix, copy tweak, or config change — no full spec ceremony |
| **When** | ≤3 files, no design decisions, no new dependencies, no auth/payments |
| **How** | `/quick` + short description of the change |

**What the agent does:**

1. Optionally runs `classify-change` to confirm Quick tier
2. Writes `.specs/quick/NNN-slug/TASK.md` → implement → tests
3. `check-commit` → writes `SUMMARY.md`
4. Runs `validate-quick` until the gate passes

**CLI (agent runs — optional for you):**

| Command | Role in Quick |
| --- | --- |
| `classify-change "…" [files…]` | Heuristic tier check (quick vs promote to specify) |
| `validate-quick [NNN-slug]` | Gate: TASK.md / SUMMARY.md shape, ≤3 files, no sensitive paths |
| `check-commit --message "…"` | Conventional Commits before landing |

**Skip when:** More than 3 files, new dependencies, auth/payments/data — use `/specify` instead.

---

## `/elicit` — structured Q&A before Specify (optional)

| | |
| --- | --- |
| **Type** | Agent command — loads `references/elicitation.md` |
| **Purpose** | Read kickoff brief + repo; ask **≤5 objective questions per round**; write `requirements-brief.md` |
| **When** | Kickoff exists but details missing; or request is vague ("add interface", "improve login") |
| **How** | `/elicit` + project or feature scope; paste kickoff in chat if no file yet |

**Not the same as `/analyze`** — `/analyze` checks spec ↔ tasks consistency **after** tasks exist.

**Scopes:**

| Scope | Artifact | Next |
| --- | --- | --- |
| **project** | `.specs/project/requirements-brief.md` | ROADMAP candidates → `/specify` per feature |
| **feature** | `.specs/project/feature-briefs/[slug]/requirements-brief.md` | `feature-init` → `/specify` |

**CLI (agent runs):**

| Command | Role |
| --- | --- |
| `req-analysis init "…" --scope project\|feature` | Scaffold brief template |
| `req-analysis discover` | List local kickoff files (`prd.md`, `kickoff.md`, …) |
| `req-analysis validate [brief.md]` | Gate: approved requirements brief before `/specify` |
| `req-analysis context [--scope …] [--slug …]` | Kickoff + brief bundle for Specify |
| `req-analysis promote --scope …` | Print next steps after owner approves brief |
| `validate-req-analysis [brief.md]` | Same gate (direct Python entry) |

**Skip when:** Request is already testable — go to `/specify`. Owner can always refuse Elicitation.

---

## `/explore` — think before you commit (optional)

Research ideas, compare approaches, or spike — **no production code**. Does not open a feature folder unless you proceed to `/specify`.

---

## `/discuss` — resolve gray areas (conditional)

Lock product decisions before the spec is final — auth rules, data model, edge cases. Produces `.specs/features/…/context.md`.

---

## `/plan` — technical design (optional, Complex tier)

Document architecture, APIs, and patterns **before** tasks. Writes `design.md`. **Stops for your approval** before `/tasks`.

---

## `/tasks` — break work into provable jobs (Medium+)

Turn the approved spec into atomic tasks — files, tests, gate, binary “done when”. Runs `analyze-artifacts` + `validate-tasks`. **Stops for your approval** before `/loop`.

---

## `/task-graph` — parallel work topology (3+ tasks)

Draw which jobs can run in parallel. Writes or updates `task-graph.md` per `task-graph-engineering.md`.

---

## `/analyze` — cross-check before you approve tasks

Catch drift between spec, design, and tasks **before** implementation. Runs `analyze-artifacts`.

---

## `/loop` — orchestrate Execute (parallel when safe)

Implement approved tasks — test-first, one commit per task, gates between steps.

**What the agent does each round:**

1. `loop-plan [feature]` — next wave + parallel groups
2. **Parallel group (2+ tasks):** `workspace-prepare [feature] --tasks T1,T2` → dispatch sub-agents (you confirm) per `sub-agents.md`; each worker uses its git worktree under `.specs/workspaces/`
3. **Single task:** test first → implement → gate → `check-commit` → mark `[x]` in `tasks.md`
4. Before touching files: `execution-policy check-path <path>` when scope is configured in `.specs/config.yaml`
5. On gate retry: `execution-policy record-retry Tn` (respects `max_retries_per_task`)
6. Merge after parallel rounds; `workspace-cleanup [feature] --force`; repeat until done → `/verify`

---

## `/verify` — independent proof (always required)

Prove the spec was met — with test `file:line` evidence, not self-report. Verifier must **not** have written the code.

**What the agent does:**

1. Drafts `validation.md` with coverage lines
2. Runs `validate-traceability` (REQ → tasks → coverage)
3. Runs `validate-state` (PASS verdict, evidence, sensor on Medium+)

**Never skip** (except Quick tier uses a lighter path inside `quick-mode.md` + `validate-quick`).

---

## `/archive` — fold finished work into project memory

Only after `/verify` returns **PASS**. Runs `archive-feature` (re-checks `validate-traceability` then `validate-state`); updates domain spec, `ROADMAP.md`, resets `STATE.md`.

---

## `/converge` — spec and code drifted (recovery)

Re-sync when implementation proved the spec or tasks are wrong. Runs `analyze-artifacts`; **stops for your approval** before more `/loop`.

---

## `/handoff` — end of session

Persist decisions and next step in `.specs/STATE.md` so the **next** chat can continue.

---

## `/project-init` — brownfield: map an existing repo (once)

Scan existing codebase → `PROJECT.md`, domain stubs, `ROADMAP`, config. **Before** the first `/specify` on legacy code.

---

## `/constitution` — project principles (once)

Governing rules for every later spec. Writes `.specs/project/CONSTITUTION.md`.

---

## `/lessons` — learn from verify failures

Record grounded lessons when Verify fails. Uses `lessons.py`; confirmed lessons appear in `LESSONS.md`.

---

## CLI helpers (terminal — humans or agents)

These are **not** chat slash commands. Useful when you want a status check without opening a full phase:

| Command | Purpose |
| --- | --- |
| `doctor [path]` | Install readiness score + Execute hint; banners if Python is missing |
| `classify-change "desc" [files…]` | Heuristic complexity tier (`--json` optional) |
| `feature-status [feature]` | Artifacts present, task counts, next recommended gate |
| `validate-traceability [feature]` | REQ → tasks → validation coverage chain |
| `validate-quick [quick-folder]` | Quick-mode structural gate |
| `phase-context <phase>` | Print `.specs/config.yaml` rules for a phase |
| `workspace-prepare <feature> --tasks T1,T2` | Create git worktrees for parallel Execute |
| `workspace-list <feature>` | List isolated worktrees for a feature |
| `workspace-cleanup <feature> [--force]` | Remove worktrees after merge or worker FAIL |
| `execution-policy status` | Budget, scope, and runtime counters |
| `execution-policy check-path <path>` | Scope + intent/effect check (use `--op read|write|delete`) |
| `execution-policy record-retry <task>` | Increment per-task retry counter |
| `execution-policy record-run` | Increment agent-run counter |
| `memory-index rebuild` | Rebuild SQLite index from `.specs/` artifacts |
| `memory-query --from <id> [--depth N]` | Bounded context package from the knowledge graph |
| `memory-search <query>` | Full-text search over indexed artifact chunks (FTS5) |
| `memory-retrieve "<query>"` | Hybrid retrieval (FTS + graph + optional semantic) |
| `memory-index embed [--force]` | Build optional embeddings (requires config) |
| `context-guard status` | Execute readiness (STATE + open tasks) |
| `context-guard check-edit <path>` | Contextual guard before editing (scope + task Files) |
| `context-guard check-complete [feature]` | Guard before claiming completion (tasks + validation PASS) |
| `sandbox status` | Sandbox policy mode (`off` \| `warn` \| `strict`) |
| `sandbox check-command "<cmd>"` | Test a shell command against deny patterns |
| `solution-explore init <feature> --candidates A,B` | Start explicit solution exploration (worktrees + exploration.md) |
| `solution-explore validate [feature]` | Comparison matrix complete before decision |
| `solution-explore select <feature> --candidate A --rationale "…"` | Record exploration winner |

Full CLI list: `npx @luizsantiago/spec-guardrails --help`.

---

## Related

- [Concepts](concepts.md) — how spec-driven, loop, and graph fit together
- [Skills and hub](skills-and-hub.md) — what each skill file does
- [Gates reference](gates.md) — what the agent runs at each phase
- [Platform parity](Platform-parity.md) — Cursor, Claude Code, Copilot, Codex, and AGENTS.md
- [Cursor hooks and sandbox](Cursor-hooks-and-sandbox.md) — automatic IDE protection, tuning, performance
- [Quick start](Quick-start.md) — first ten minutes
