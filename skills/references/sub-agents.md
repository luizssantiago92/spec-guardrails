# Sub-Agents

Operational protocol for multi-agent Execute. Sister material to `task-graph-engineering.md`
(topology) — this file is the **payload, summary, failure, and merge** contract.

## When to Use

- `loop-plan` shows a parallel group with 2+ ready tasks (disjoint `Files`)
- `task-graph.md` marks a parallel group and the owner accepted the split
- `tasks.md` packs into more than one ~7-task batch (roughly more than 8 tasks total)
- Diamond verify needs a fresh context that never wrote the code

## When NOT to Use

- ≤8 tasks that fit one batch — execute inline
- Sequential work where each step needs the previous step's full picture
- The owner declined the sub-agent offer

**Never auto-spawn.** Offer the split, wait for an explicit yes.

## Batch packing

1. Walk `### Phase N` groups in order (or document order when phases are unused).
2. Pack consecutive **whole** phases into a batch until the batch would exceed ~7 tasks.
3. Never split a phase across workers.
4. Batches run **sequentially**. Parallelism lives *inside* a batch only when `task-graph.md` marks a parallel group and Files are disjoint.

## Worker payload

Hand each worker exactly this and nothing else from sibling features:

```markdown
# Worker brief

- Feature: [feature]
- Batch: B[n] of [total]
- Tasks: T[a] … T[b] (in order)
- Workspace: `.specs/workspaces/[feature]/T[n]` (git worktree — do not edit the main tree)
- Spec excerpt: only the REQ IDs those tasks name
- Files ownership: the union of those tasks' Files fields (exclusive)
- Constraints: AD-NNN that apply; confirmed lessons that apply
- Forbidden: git push, deploy, editing files outside ownership, spawning further sub-agents
```

Before dispatch, the orchestrator runs `workspace-prepare [feature] --tasks …`. Each worker verifies and commits inside its worktree only. The merge owner integrates into the main tree, runs the project harness once, then `workspace-cleanup [feature] --force`.

Load per `context-limits.md`. Do not paste the author's chat.

## Worker loop

For each task in order:

1. Read the task fields. Implement test-first from the named criteria.
2. Run the task `Gate`. Non-zero → fix (max 3 loops) or stop and report failure.
3. Run `check_commit.py` on the message, mark the task `[x]`, commit atomically.
4. Do not start the next task until the commit exists.

## Compact summary (required return)

Every worker returns this shape — no narrative dump:

```markdown
## Batch B[n] summary
- Status: PASS | FAIL
- Tasks done: T1, T2
- Commits: abc1234, def5678
- Tests: 12 passed / 0 failed
- Deviations: none | [what changed vs tasks.md]
- Blockers: none | [gate output excerpt]
```

## Two-stage batch review (orchestrator)

After workers return and **before** merge, the orchestrator runs both stages. Workers do not self-certify merge readiness.

| Stage | Question | Evidence |
| --- | --- | --- |
| **1 — Spec compliance** | Does each commit satisfy its task `Done when` and the REQ IDs on that task? | Re-read task blocks + diff; compare to spec criteria |
| **2 — Code quality** | Is the integrated harness green, free of new suppressions, and scoped to task `Files`? | Project harness + `check_suppressions.py` on staged diff |

| Outcome | Action |
| --- | --- |
| Stage 1 FAIL | Send worker back, or rewrite the task — do not merge |
| Stage 2 FAIL | Fix or revert before merge — do not weaken tests |
| Both PASS | Merge owner integrates worktrees, runs harness once, proceeds |

Pattern adapted from [Superpowers subagent-driven-development](https://github.com/obra/superpowers) — compliance before polish.

## Failure handling

| Event | Action |
| --- | --- |
| Gate fails 3 times on one task | Stop the batch. Return FAIL summary. Do not continue later tasks in the batch. |
| Worker edits a file outside ownership | Treat as FAIL. Merge owner reverts or reassigns. |
| Batch FAIL | Orchestrator does not start the next batch. Escalate or rewrite tasks. |
| Verify FAIL | Gaps become fix tasks; fix → re-verify loop bounded to 3, then escalate. |

## Merge owner

One agent (usually the orchestrator) owns merge after each batch and after Verify:

1. Confirm every task checkbox in the batch is `[x]` and commits are present.
2. Run the project harness once on the integrated tree.
3. Resolve conflicts; never ask two workers to touch the same file in the same round.
4. Only after the final batch: dispatch the **Verifier** (fresh context). See `validate.md`.
5. Hand off via `git-handoff.md` — push only with an explicit go-ahead.

## Verifier dispatch

Always-on after the last task commit. Payload:

- `spec.md` (+ `context.md` when present)
- Diff range for the feature
- Tests named by the spec / tasks
- `security-review.md` checklist
- **Not** the author chat, worker summaries as proof, or `STATE.md` Next Step as evidence

The verifier writes `validation.md` and runs `validate_state.py`. A PASS WITH GAPS is FAIL.

## Model tier (optional)

When Spec Guardrails can pick a model per sub-agent:

| Role | Tier |
| --- | --- |
| Mechanical batch | Fast |
| Ambiguous / core-domain batch | High reasoning |
| Verifier | Mid-to-high |

Otherwise ignore and invest more care on heavy steps.

## Related

- `task-graph-engineering.md` — DAG, stop rule, diamond, one writer per file
- `references/implement.md` — when to offer delegation
- `references/validate.md` — verifier procedure
- `references/context-limits.md` — what a worker may load
