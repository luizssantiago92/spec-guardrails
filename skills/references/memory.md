# Memory

Project memory that survives session amnesia: decisions, handoff, and resume.

## When to Use

- Session start (resume)
- Session end (pause / handoff)
- Any time a project-level decision is made
- Any time verification produces a grounded lesson

## Artifacts

| File | Owner | Purpose |
| --- | --- | --- |
| `.specs/STATE.md` | Agent + owner | Decision log (`AD-NNN`) and handoff snapshot |
| `.specs/lessons.json` | `lessons.py` | Canonical lessons store |
| `.specs/LESSONS.md` | `lessons.py` | Generated playbook of confirmed lessons |
| `.specs/project/PROJECT.md` | Owner | Vision, stack, constraints |
| `.specs/project/ROADMAP.md` | Owner | Milestones and feature status |

## Resume Protocol

Run at every session start, before writing any code:

1. **Read `STATE.md`** — active feature, phase, next step, blockers.
2. **Reconcile against git.** The snapshot can be stale; evidence wins:
   ```bash
   git branch --show-current
   git status --porcelain
   git log --oneline -10
   ```
   Compare with `tasks.md` checkboxes. If commits exist for tasks that STATE says are pending, git is right — update STATE.
3. **Run the project harness** (tests, lint) before adding new code, so you know the starting baseline.
4. **Load only what this step needs** — the current feature's spec, plus `context.md` or `design.md` when relevant. Never load two feature specs at once. See `context-limits.md`.
5. **Propose the reconciled next step** and confirm it with the owner when it is ambiguous or stale.

## Pause / Handoff Protocol

Run at session end or at a phase milestone:

1. Refresh every section of `STATE.md` (template below).
2. Append a grounded lesson with `lessons.py add` if verification failed. Never hand-edit `LESSONS.md`.
3. Run the relevant gates and tests — never hand off a red tree silently.
4. Commit `.specs/` per `git-handoff.md`. **Never auto-push.**

## STATE.md Template

```markdown
# Project State & Decisions

## Active Feature
- Feature: [name]
- Phase: [Specify|Discuss|Design|Tasks|Execute|Verify]
- Branch: [branch-name]

## Next Step (single item)
- [ ] [one concrete action]

## Blockers
- [open questions or dependencies, or "none"]

## Deferred Ideas
- [good ideas found during Execute that were out of scope]

## Decisions

### AD-001: [Decision title]
- **Date**: [ISO date]
- **Context**: [why this came up]
- **Decision**: [what was decided]
- **Consequences**: [what this constrains going forward]
```

## Decision Log Rules

- `AD-NNN` numbers are sequential and never reused.
- Record a decision when it constrains **future work beyond this feature**. Feature-local choices belong in `context.md` or `design.md`.
- Superseding a decision adds a new `AD-NNN` that references the old one — never edit history in place.

## Lessons Rules

Lessons are owned by `lessons.py`, not by hand. See `lessons.md`.

- Record only from a **grounded failure** in `validation.md`: a surviving mutant, an imprecise acceptance criterion, a failed requirement, or a spec deviation.
- A clean PASS records nothing.
- `--source` is mandatory. Candidates are not guidance; only `list --status confirmed` is.
- Do not edit `LESSONS.md`. The engine generates it from `lessons.json`.

## Rules

- Write every artifact in **English**.
- Lazy artifacts: never scaffold empty files to look organized.
- `STATE.md` has exactly one "Next Step" item. A list of five is not a handoff.

## Retrieval ladder

Rebuild the derived index after meaningful `.specs/` changes:

```bash
npx @luizsantiago/spec-guardrails memory-index rebuild
```

| Need | Command |
| --- | --- |
| Exact entity + neighbors | `memory-query --from T1 --depth 2` |
| Keyword search in artifact bodies | `memory-search "oauth session"` |
| Ranked hybrid package (FTS + graph + optional semantic) | `memory-retrieve "silent session expiry"` |

Optional semantic retrieval stays **off** by default in `.specs/config.yaml`. Enable only when FTS + graph are not enough:

```yaml
memory:
  retrieval:
    semantic: true
    provider: openai   # or ollama | hash (local/testing)
    model: text-embedding-3-small
```

Then embed after rebuild:

```bash
npx @luizsantiago/spec-guardrails memory-index embed
```

Markdown under `.specs/` remains the source of truth; the SQLite index is rebuildable.

## Next

`git-handoff.md` — what to stage, how to word the commit, and why no auto-push.
