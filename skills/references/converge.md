# Converge

Reassess the codebase against spec/plan/tasks and append remaining work.

## When to Use

- Long Execute session — drift suspected
- Owner asks "what's left?"
- Partial implementation landed outside the task list
- After merging upstream changes into a feature branch

## When NOT to Use

- Before Tasks exist
- During Verify (use `validate.md` instead)

## Inputs

- Current feature artifacts (`spec.md`, `tasks.md`, `design.md`)
- Git diff and test status
- `.specs/STATE.md`

## Output

Updated `tasks.md` with new tasks for uncovered work (append only — do not rewrite completed tasks).

## Procedure

1. **Re-read the spec** — list every REQ and whether tests exist for its outcome.
2. **Audit the diff** — files changed outside task `Files` fields are scope drift or missing tasks.
3. **Living-spec drift (lightweight)** — when `domains/<slug>/spec.md` exists, spot-check that files still match declared globs or modules; append a task if production code moved without updating domain memory.
4. **Run analyze** — `analyze_artifacts.py [feature]`.
5. **Append tasks** for gaps using the standard task template in `tasks.md`.
6. **Refresh dashboard** — `npx @luizsantiago/spec-guardrails feature-overview [feature] --write`.
7. **Update STATE** Next Step to the first open task.
8. **Commit** `.specs/` changes (Tier 0) — no push.

## Rules

- Never delete completed task checkboxes.
- Never weaken tests to match partial implementation.
- New tasks need Requirement, Files, Depends on, Tests, Gate, Done when.
- Re-run `validate_tasks.py` after editing tasks.
- When `loop-plan --json` shows `converge_suggest`, run this procedure before more Execute.

## Next

- Resume → `implement.md`
- Spec itself wrong → `specify.md` (delta spec for brownfield)
- Back → `agent-architecture.md`
