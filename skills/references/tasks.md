# Tasks

Break the work into atomic tasks with real dependencies and binary done criteria. Optional phase.

## When to Use

- More than 3 obvious steps
- Multiple files, modules, or people involved
- Any work that could be split across parallel agents

## When NOT to Use

- ≤3 obvious steps — list them inline at the start of Execute instead

**Safety valve:** if the inline listing in Execute reveals more than 5 steps or real dependencies, STOP and create a formal `tasks.md`. The Tasks phase was skipped in error.

## Inputs

- Approved `spec.md` (and `design.md` when it exists)
- `task-graph-engineering.md` for topology rules
- `context-limits.md` if the breakdown is large — keep each task's file list short enough to load

## Output

`.specs/features/[feature]/tasks.md`, plus `task-graph.md` when the feature has 3+ tasks or parallel work.

## Procedure

1. **Write one task per deliverable.** A task is something you would hand to a single agent and check in one commit.
2. **Prefer vertical slices.** One thin verifiable path per **feature** (e.g. register), not “all schema then all APIs then all UI” as *phases*. Split UI vs API into separate tasks with `Depends on` when they must stay sequential. Vertical still means a thin *feature*, not one task that mixes unrelated areas without a dependency edge.
3. **Give every task the full field set.** Authoring and the gate require all six:
   - `Requirement` — the spec ID it serves (gated)
   - `Files` — where the change lands (gated; required; `none` / `—` rejected; overlap across independent tasks blocks)
   - `Depends on` — real dependencies only, or `—` (gated; `—` means none)
   - `Tests` — the test file that proves it (gated; `none` / `—` rejected)
   - `Gate` — the command that must pass (gated; `none` / `—` rejected)
   - `Done when` — binary criterion (gated; `none` / `—` rejected)
4. **Delete fake edges.** For every "and then", ask whether the next task actually reads the previous task's output. If not, the edge is fake — remove it and the tasks can run in parallel. See `task-graph-engineering.md`.
5. **Order tasks so dependencies come first.** Forward dependencies fail the gate. When grouping under `### Phase N`, a task must not depend on a task in a later phase.
6. **Apply the stop rule.** Only split work that never reads its siblings' results; sequential work stays with one agent.
7. **Cover every acceptance criterion.** Fill `## Test Coverage Matrix` and `## Gate Check Commands` **before** presenting the list. An unmapped requirement is a missing task. Align each task `Tests` / `Gate` field with those sections.
8. **Draw the graph** in `task-graph.md` when there are 3+ tasks or any parallel group.
9. **Run analyze, then the tasks gate**, then present the breakdown for approval.
   ```bash
   python3 .specs/guardrails/scripts/analyze_artifacts.py [feature]
   python3 .specs/guardrails/scripts/validate_tasks.py [feature]
   ```

**Authoring vs gate.** `validate_tasks.py` already enforces REQ coverage and `Tests`/`Gate` fields. The matrix and Gate Check Commands sections are an owner/verifier checklist (judgment) until a future form gate — do not skip them when Tasks ran.

## Gate

```bash
python3 .specs/guardrails/scripts/validate_tasks.py .specs/features/[feature]/tasks.md
python3 .specs/guardrails/scripts/validate_tasks.py [feature]
python3 .specs/guardrails/scripts/validate_tasks.py          # single-feature projects
```

Checks task IDs, required fields (including `Files` and `Done when`), dependency direction, later-phase dependencies, cycles, granularity smells, **spec requirement coverage**, and **Files overlap** across independent tasks. `Files`/`Tests`/`Gate`/`Done when` set to `none` or `—` fail. Non-zero exit means STOP.

Task headings, fields, and spec requirement IDs are read from visible markdown — fenced samples and HTML comments do not count. When a sibling `spec.md` exists, every requirement heading ID under `## Requirements` must appear in at least one task `Requirement` field. Independent tasks (no dependency path either way) must not share a path in `Files` (`./path`, `/path`, `../path`, quotes, markdown links, case variants, and `path` count as one).

The gate does not check that `Done when` is philosophically binary — you do. A passing gate is necessary, not sufficient. Path overlap uses the shared `normalize_file_path` helper (quotes, markdown links, `./`, `/`, `../`, drive letters, casefold).

## Execution Plan (phases)

Use `### Phase N` when the work has a real staging constraint (schema before handlers, handlers before UI). Phases are ordered groups, not a second ID scheme.

```markdown
# Tasks: Authentication

### Phase 1

### T1: Create session token module
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: test/auth/token.test.ts
- **Gate**: npm test
- **Done when**: module signs and verifies tokens
- [ ] complete

### Phase 2

### T2: Add login endpoint handler
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: T1
- **Tests**: test/routes/login.test.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200 for valid credentials
- [ ] complete
```

Rules the gate enforces:

- A task in Phase 1 must not depend on a task in Phase 2 or later
- Document order still matters: dependencies must appear before dependents
- Tasks with no phase heading are treated as phase 0 (ungrouped) and may depend only on other ungrouped or earlier-phase tasks

Do not invent phases to make the list look organized. Two tasks that can run in the same round belong in the same phase, or in no phase at all.

## Template

```markdown
# Tasks: [Feature]

### T1: [Imperative, specific title]
- **Requirement**: REQ-001
- **Files**: src/auth/token.ts
- **Depends on**: —
- **Tests**: test/auth/token.test.ts
- **Gate**: npm test
- **Done when**: token module signs and verifies tokens
- [ ] complete

### T2: [Imperative, specific title]
- **Requirement**: REQ-001
- **Files**: src/routes/login.ts
- **Depends on**: T1
- **Tests**: test/routes/login.test.ts
- **Gate**: npm test
- **Done when**: endpoint returns 200 for valid credentials
- [ ] complete

## Test Coverage Matrix
| Requirement | Task | Tests | Notes |
| --- | --- | --- | --- |
| REQ-001 | T1, T2 | test/auth/token.test.ts, test/routes/login.test.ts | |

## Gate Check Commands
| Level | Command |
| --- | --- |
| Task | the per-task `Gate` field |
| Feature | npm test |
```

## Granularity

| Too coarse | Atomic |
| --- | --- |
| "Create form" | T1: add email input component · T2: add email validation · T3: add submit handler |
| "Implement feature" | One task per file or per contract |
| "Fix bugs" | One task per reproducible defect |
| "Add auth" | T1: token module · T2: login handler · T3: refresh handler |
| "Write tests" | The tests belong on the task that produces the behavior, not as a follow-up |

A task that cannot be verified by a single named test is not atomic yet. A title under three words is a smell the gate warns about (`"Add endpoint"` → `"Add login endpoint handler"`).

## Good and bad dependencies

| Edge | Real or fake | Why |
| --- | --- | --- |
| Login handler depends on token module | Real | The handler imports and calls the module |
| README update depends on login tests | Fake | README does not read test output |
| Refresh handler depends on login handler | Fake, unless it shares a type the login task creates | Same auth package can land in parallel if files differ |
| UI form depends on API contract | Real if the form types are generated from the handler | Otherwise the form can mock the contract and run in parallel |

Delete fake edges before drawing `task-graph.md`. Most first drafts hide two or three.

## Coverage matrix

Before approval, map every spec requirement heading under `## Requirements` to at least one task. Every task `Tests` path should appear in the matrix. Fill `## Test Coverage Matrix` and `## Gate Check Commands` in `tasks.md` (see Template).

| Requirement | Task | Tests | Notes |
| --- | --- | --- | --- |
| REQ-001 | T2 | test/routes/login.test.ts | valid credentials → session |
| REQ-001 | T2 | test/routes/login.test.ts | invalid → 401 `AUTH_INVALID` |
| REQ-002 | T3 | test/routes/refresh.test.ts | refresh rotates the token |

A requirement with no row is unimplemented by construction. Do not present the breakdown until the matrix is complete. The Python gate already fails uncovered REQ IDs; the table is for humans and Execute.

`Files` lists on parallel tasks must be disjoint. If two tasks name the same file, they are one task, or they are sequential.

## Next

- 3+ tasks or parallel groups → `/task-graph` per `task-graph-engineering.md`
- Otherwise → `implement.md`
