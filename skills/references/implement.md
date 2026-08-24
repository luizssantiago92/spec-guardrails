# Implement (Execute / Loop)

Orchestrate tasks from `tasks.md` and `task-graph.md`: **parallel waves with sub-agents** when files are disjoint, otherwise **one task at a time** inline. Always required after Specify (and Tasks, when it ran).

## When to Use

- Every feature after Specify (and Tasks, when it ran)

## Inputs

- Approved `spec.md`, plus `design.md`, `tasks.md`, `task-graph.md` when they exist
- Confirmed lessons: `python3 .specs/guardrails/scripts/lessons.py list --status confirmed`
- `engineering-standards.md` for code quality and artifact language
- `context-limits.md` — load only this feature and the files the current task names

## Outputs

- Production code and tests
- One atomic commit per task
- Updated `tasks.md` checkboxes

## Before Starting

1. Read this file completely.
2. **Discover this repo’s test command** from `package.json`, `Makefile`, CI, or README — prefer the focused command the task `Gate` names. Do not assume `npm test` if the project uses another runner.
3. Run `python3 .specs/guardrails/scripts/validate_tasks.py` when a formal `tasks.md` exists.
4. If Tasks was skipped, list the atomic steps inline now. More than 5 steps or real dependencies means the Tasks phase was skipped in error — stop and create `tasks.md`.
5. **Plan the wave** — run `python3 .specs/guardrails/scripts/loop_plan.py [feature]` (or `loop-plan --json`) at the start of Execute and after every batch completes. It lists the next runnable tasks and marks **parallel groups** (disjoint `Files`) vs inline work.
6. When `loop-plan` shows a **parallel group** (2+ tasks), prepare isolated workspaces before dispatch:

```bash
npx @luizsantiago/spec-guardrails workspace-prepare [feature] --tasks T1,T2
```

Each worker runs in its own git worktree under `.specs/workspaces/[feature]/`. After local verification and merge, clean up:

```bash
npx @luizsantiago/spec-guardrails workspace-cleanup [feature] --tasks T1,T2 --force
```

7. Consult execution policy and contextual guards before touching files:

```bash
npx @luizsantiago/spec-guardrails context-guard status
npx @luizsantiago/spec-guardrails context-guard check-edit src/auth.ts --op write
npx @luizsantiago/spec-guardrails execution-policy check-path src/auth.ts --op write
npx @luizsantiago/spec-guardrails execution-policy status
```

Declare the intended operation (`read`, `write`, or `delete`). When `--op` is omitted, the CLI infers `read` for common doc/config extensions and `write` otherwise. Effect rules in `.specs/config.yaml` (`effects.deny_*`, `effects.warn_*`) apply after scope checks.

Record gate retries with `execution-policy record-retry T1` when a task fails its gate (respects `max_retries_per_task` in `.specs/config.yaml`).

8. When `loop-plan` shows a **parallel group** (2+ tasks), offer sub-agent dispatch per `task-graph-engineering.md` and `sub-agents.md`. Offer and wait; never auto-spawn. Large features (roughly 8+ tasks total) also warrant batching across waves.
9. Confirm you are the only writer for each file this task names. Two parallel tasks never share a file in the same round.

## Orchestration (each /loop round)

```
loop-plan → dispatch (parallel sub-agents | inline) → merge → loop-plan → … → /verify
```

1. **loop-plan** — Read the next wave: which tasks have satisfied dependencies and disjoint file ownership.
2. **Dispatch**
   - **Parallel group (2+ tasks):** one sub-agent per task with the worker brief in `sub-agents.md`. Cap at 3 workers + 1 verifier (see `task-graph-engineering.md`).
   - **Single task:** run the per-task cycle below inline (or as sole worker).
3. **Merge** — After a parallel round, confirm every task is `[x]`, commits exist, and the project harness passes once on the integrated tree.
4. **Repeat** — Run `loop-plan` again until all tasks are complete, then close Execute.

Do not start the next wave until the current wave is fully committed. Parallelism is **inside** a wave only when `Files` do not overlap.

## Per-Task Cycle

```
Plan → Test → Implement → Gate → Commit → Next
```

1. **Plan** — Restate the task's `Done when` criterion and the files you will touch. Nothing else gets touched.
2. **Test first** — Write the test derived from the acceptance criteria. It must fail for the right reason before you write production code.
3. **Implement** — The smallest change that makes the test pass, following the conventions already in the codebase.
4. **Gate** — Run the task's `Gate` command. The runner decides, not your judgment. On failure, follow the playbook below.
5. **Mark complete** — Check the task box in `tasks.md` in the same change set.
6. **Commit** — One atomic commit including the code, the tests, and the `tasks.md` update — only after Adequacy A–D pass.

```bash
python3 .specs/guardrails/scripts/check_commit.py --message "feat(auth): add token refresh"
git add [files] .specs/features/[feature]/tasks.md
git commit -m "feat(auth): add token refresh"
```

## Adequacy (before commit)

Verifier judgment, not a structural gate. If any check is No, do not commit — continue the cycle or escalate.

| Check | Ask |
| --- | --- |
| **A Outcome** | Does the new test assert this task’s `Done when` / spec criterion (not merely that code ran)? |
| **B Scope** | Do `git status` and the task `Files` list agree — no sibling files in the index? |
| **C Gate** | Did this task’s `Gate` command pass? |
| **D Spec** | No extra behavior outside the spec? If the spec is wrong, stop and follow Spec Deviation (`SPEC_DEVIATION`) — do not adapt in code. |

A gate that passes while A or D fails is not done.

**Anti-rationalizations (judgment):** “test after code” → no, RED first (**A**). “Gate green = done” → still need **A**/**D**. “Nearby sibling files” → stay in `Files` (**B**). “Spec is slightly wrong” → Spec Deviation, never silent adapt (**D**).

**Optional simplify.** On Medium+ after A–D (or when the owner asks), offer to load **only** `code-simplify.md`, then drop it — never with AppSec/QA/ship-ready. Judgment; not gated.

## Gate Failure Playbook

A failing gate is information. Do not skip, delete, or loosen a test to make it pass.

| Failure | First move | Then |
| --- | --- | --- |
| New test fails for the wrong reason | Fix the test until it asserts the spec outcome and fails because the production code is missing | Re-run |
| New test fails for the right reason | Implement the smallest production change | Re-run |
| Existing test regresses | Revert unrelated edits; keep the diff inside the task's `Files` list | Re-run |
| Lint / types | Fix only what this task introduced | Re-run |
| `check_commit.py` | Rewrite the message; do not commit with `--no-verify` | Re-run |
| Flaky or order-dependent test | Isolate the external dependency; never retry-until-green | Re-run |

Retry the same task up to **3 times**. After the third failure, stop the loop and escalate to the owner with: the command that failed, the last error, the files touched, and the option you recommend.

A gate that passes while `Done when` is still false is not done. Write the missing assertion and continue the cycle.

**Right-reason test.** The new test must fail because the production behavior is absent, not because of a typo, a wrong import, or an assertion that cannot succeed. Read the failure once. If the message is about setup, fix the test; if it is the spec outcome (401 vs 200, missing field, wrong code), then implement.

**Commit checklist.** Before `git commit`: the task box is checked, `check_commit.py` has passed on the exact message, `Files` in the task and `git status` agree, and no sibling file is in the index. An unchecked box in a "done" commit fails `validate_state.py` later and wastes a verify round.

## Spec Deviation

Implementation sometimes proves the spec wrong — an ID that cannot be satisfied, an outcome the platform cannot produce, a missing error path.

1. **Stop the loop.** Do not "adapt" the spec in code.
2. Update `spec.md`, keep the original requirement ID, and add a new ID only for genuinely new behavior.
3. Record the change in `STATE.md` under Decisions or Deferred Ideas.
4. Re-run `validate_spec.py`. Re-derive affected tests.
5. Resume Execute only after the owner approves the delta.

A silent spec change during Execute is a process failure, not a shortcut.

## Parallel Task Conflicts

When this task is part of a parallel group (see `task-graph.md`):

- Touch only the files listed on this task. A file that another in-flight task owns is out of bounds, even for an import fix — leave a note in `STATE.md` instead.
- If you discover the split was wrong (two tasks must edit the same file), stop both, merge them into one sequential task, and re-run `validate_tasks.py`.
- Do not "just finish" a sibling's work because you are already in the module. That is how one-writer-per-file breaks.

## When to Stop and Escalate

Stop immediately, with a written recommendation, when any of these are true:

- The third gate retry still fails
- The work needs a file this task does not own, and the owner of that file is another in-flight task
- A gray area appears that Specify did not settle — return to `discuss.md`, do not guess
- Auth, payments, or data destruction is required and was not in the approved spec
- The remaining work is no longer the approved task list (scope doubled, architecture flipped)

Escalation is a handoff, not a pause to keep coding. Update `STATE.md` Next Step to the decision you need, then wait.

## Mid-loop Discoveries

| Discovery | Action |
| --- | --- |
| Extra file required by this task | Amend `Files` on the current task, confirm no sibling owns it, continue |
| Extra behavior required by the spec | New task, or a spec delta — not a drive-by in this commit |
| Better design than `design.md` | Record in `STATE.md` Deferred Ideas; do not redesign mid-task |
| Dead code adjacent to the change | Leave it unless the task's `Done when` names it |
| Test harness cannot express the criterion | Escalate; do not lower the criterion to what is easy to test |

## Rules

- **Surgical changes** — Touch only what the task requires. No drive-by refactors.
- **No scope creep** — Good ideas that are not in the task go to `STATE.md` under Deferred Ideas, not into the diff.
- **One writer per file** — Two parallel tasks never mutate the same file in the same round.
- **Never weaken tests** — Do not skip, delete, or loosen a test to make a gate pass.
- **Blast radius** — Local commits are authorized by task approval. `git push`, deploy, and destructive operations need an explicit go-ahead.

## Commit Format

Conventional Commits, English, one concern per commit:

```
feat(auth): add token refresh
fix(cart): prevent negative quantity on decrement
test(auth): cover session expiry edge case
docs(spec): record validation report for auth
```

## Closing Execute

When the last task is complete:

1. Run the full project harness once more (tests, linter, build).
2. Trigger `/verify` with a fresh context — mandatory, never prompted. See `validate.md`.
3. Do not declare the feature done until `validate_state.py` passes.

## Next

`validate.md` — independent verification.
