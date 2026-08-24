# Git Handoff

Version project memory and spec artifacts in git at phase boundaries and session end.
Sister skill to `agent-architecture.md` — SDD defines *what* to build; this skill defines *when and how* to persist progress in git.

## When to Use

- End of any agent session (mandatory handoff)
- After **Specify**, **Tasks**, or **Verify** phases complete
- Before switching branches, agents, or human reviewers
- When `STATE.md` or `.specs/features/` changed materially

## Resume: Reconcile Before Trusting STATE

The handoff snapshot can be stale. At session start, reconcile it against git — **evidence wins**:

```bash
git branch --show-current
git status --porcelain
git log --oneline -10
```

Compare with `tasks.md` checkboxes. If commits exist for tasks STATE lists as pending, update STATE before doing anything else. Full procedure: `references/memory.md`.

## Sister Skills (use together)

| Skill | Role |
| --- | --- |
| `agent-architecture.md` | Process — Specify → Verify workflow |
| `engineering-standards.md` | Quality — secure coding, commit format, artifact language |
| `security-review.md` | Verification — OWASP checklist for `/verify` |
| `task-graph-engineering.md` | Topology — task DAG and parallelism |
| **`git-handoff.md`** | **Persistence — git sync for `.specs/` and handoff** |

## What to Commit

### Always commit (project memory)

```
.specs/STATE.md
.specs/LESSONS.md
.specs/lessons.json
.specs/project/**/*
.specs/features/**/*
.specs/quick/**/*
.specs/guardrails/scripts/**/*
```

Treat `.specs/` as **versioned product documentation**, not ephemeral notes. The gate scripts under `.specs/guardrails/scripts/` are committed on purpose — the team and CI run the same gates as the agent.

### Never commit via handoff

```
.cursor/skills/          # installed by spec-guardrails; upstream is spec-guardrails repo
.claude/skills/
.cursor/rules/             # unless team customized — then commit intentionally
node_modules/
.env, secrets, credentials
```

### Code commits

Follow `engineering-standards.md` — separate commits for code vs docs when possible.

## Execution policy (scope and budgets)

When `.specs/config.yaml` defines `budget`, `scope`, or `escalation`, consult policy before expanding edits:

```bash
npx @luizsantiago/spec-guardrails execution-policy status
npx @luizsantiago/spec-guardrails execution-policy check-path src/auth.ts
```

- **Scope:** denied paths block with exit 1; allowed_paths (when set) restrict edits to listed globs.
- **Intent/effect:** pass `--op read|write|delete` to `check-path`; configure `effects.deny_*` and `effects.warn_*` globs per operation in `.specs/config.yaml`.
- **Retries:** after a task gate failure, run `execution-policy record-retry Tn`; stop at `max_retries_per_task` (default 3) and escalate per the Execute playbook — do not bypass with `--no-verify`.
- **Agent runs:** orchestrators may call `execution-policy record-run` when dispatching sub-agents; stop when budgets exhaust.

Policy is soft-enforced via CLI + skills — not an OS sandbox. Escalation defaults: scope expansion → human review; budget exhaustion → stop.

## Git Blast Radius (Tiers)

Structural gates enforce artifact quality. Git tiers enforce **what leaves the machine**.

| Tier | Auto on phase trigger | Owner go-ahead |
| --- | --- | --- |
| **0 — Local** | `feature-init`, `git checkout -b feat/NNN-slug`, commits for spec/tasks/code/STATE | — |
| **1 — Share** | — | `git push`, open/update PR |
| **2 — External** | — | merge, deploy, force-push, production data |

### Tier 0 triggers (automatic — no ask)

| Phase complete | Git action |
| --- | --- |
| `/specify` start | `feature-init "<description>"` → folder + branch + STATE |
| Spec approved | Commit `spec.md` (+ `context.md` if Discuss ran) |
| Tasks approved | Commit `tasks.md` (+ `task-graph.md` if created) |
| Execute (each task) | Atomic code commit per task |
| Verify PASS | Commit `validation.md` |
| `/handoff` | Commit `.specs/` snapshot |
| `/archive` | Commit ROADMAP + domain spec merge |

**Quick tier:** no dedicated branch — commit on current branch.

### Tier 1 — share (explicit once per feature)

Stop after local commits. Owner says "push" / "open PR" before:

```bash
git push -u origin feat/003-chat-system
```

### Tier 2 — external (explicit per action)

Merge, deploy, tags, force-push — each needs a separate go-ahead. `ship-ready.md` documents readiness; it never authorizes push.

## Handoff Workflow (`/handoff`)

Run at session end or phase milestone:

### 1. Update memory

Use this structure in `.specs/STATE.md`:

```markdown
## Active Feature
- Feature: [name]
- Phase: [Specify|Design|Tasks|Execute|Verify]
- Branch: [branch-name]

## Decisions (this session)
- [decision and rationale]

## Next Step (single item)
- [ ] [one concrete action]

## Blockers
- [open questions or dependencies]
```

- Refresh all sections above each handoff
- Record a grounded lesson with `lessons.py add` if verification failed. Never hand-edit `LESSONS.md`.

### 2. Validate before commit

- Run relevant tests / linters (operational harness — not self-declaration)
- Ensure no secrets in staged files
- Commit messages in **English** (Conventional Commits):
  ```bash
  python3 .specs/guardrails/scripts/check_commit.py --message "docs(spec): update STATE handoff for auth"
  ```

### 3. Stage and commit

```bash
git add .specs/
git status   # review — no secrets, no accidental paths
git commit -m "docs(spec): update STATE handoff for [feature]"
```

### 4. Do NOT auto-push (Tier 1)

Stop after commit. Owner handles `git push` and PRs (Tier 1).

## Commit Messages by Phase

| Phase completed | Example commit |
| --- | --- |
| Specify | `docs(spec): add REQ-001 auth requirements` |
| Design | `docs(spec): design OAuth flow for auth feature` |
| Tasks | `docs(spec): task breakdown for auth feature` |
| Task graph | `docs(spec): add task graph for auth feature` |
| Verify | `docs(spec): validation report auth feature` |
| Session handoff | `docs(spec): update STATE handoff — auth in progress` |
| Lessons learned | `docs(spec): record lesson — JWT expiry edge case` |

## Phase Boundary Rules

| Event | Git action |
| --- | --- |
| Spec approved | Commit `spec.md` (+ `context.md` when Discuss ran) |
| Tasks approved | Commit `tasks.md` (+ `task-graph.md` if created) |
| Verify passed | Commit `validation.md` after `validate_state.py` passes |
| Execute loop | Atomic code commits per task (existing Execute rules) |
| Session ends | `/handoff` — always update STATE + commit `.specs/` |

## `.gitignore` Guidance

Ensure target projects **do not** ignore `.specs/`:

```gitignore
# Keep .specs/ tracked — it is project memory
# DO NOT add: .specs/
```

Agent tooling and Python bytecode stay ignored:

```gitignore
.cursor/skills/
.claude/skills/
.specs/guardrails/scripts/__pycache__/
```

The gate scripts themselves are committed; only their compiled bytecode is ignored.

## Evidence-or-Zero for Handoff

A handoff is complete only when:

1. `STATE.md` has a concrete "Next step" line
2. `git log -1` shows the handoff commit
3. Staged files were reviewed (no secrets)

Commit messages and every `.specs/` artifact are written in **English**.

## Related Commands

| Command | Action |
| --- | --- |
| `/handoff` | End session — update STATE, commit `.specs/`, no push |
| `/sync-spec` | Commit current feature spec artifacts only (`spec.md`, `tasks.md`, `task-graph.md`, etc.) |
| `/verify` | After verify — commit `validation.md` (see `references/validate.md`) |

## Related Skills

- `agent-architecture.md` — SDD hub, execution contract, gates
- `references/memory.md` — STATE semantics, decision log, reconcile protocol
- `engineering-standards.md` — commit format and blast radius
- `task-graph-engineering.md` — commit `task-graph.md` at phase boundaries
