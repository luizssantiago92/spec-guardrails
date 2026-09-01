# Tutorial 3 — Parallel worktrees + two-stage review

**Goal:** Run disjoint tasks in isolated git worktrees with batch review before merge.

**Time:** ~60 minutes  
**Tier:** Parallel (3+ tasks, disjoint `Files`)

## Scenario

Feature splits into backend API (`src/api/`) and frontend form (`src/ui/`) with no shared files in the same wave.

## Prerequisites

Complete [Tutorial 2](02-medium-feature.md) or have an approved `tasks.md` with disjoint file lists.

## Steps

### 1. Draw the graph

Agent creates `task-graph.md` marking parallel group **A** (disjoint files only).

Run:

```bash
python3 .specs/guardrails/scripts/validate_tasks.py <feature>
```

### 2. Prepare worktrees

When `loop-plan` shows tasks T1 and T2 in parallel:

```bash
npx @luizsantiago/spec-guardrails workspace-prepare <feature> --tasks T1,T2
```

Each worker uses `.specs/workspaces/<feature>/T<n>/` — never the main tree.

### 3. Worker execution

Per `references/sub-agents.md`, each worker:

1. Test-first per task
2. Gate + `check_commit.py` + `check_suppressions.py`
3. Returns a **compact summary** (commits, tests, deviations)

### 4. Two-stage batch review (orchestrator)

After workers return, before merge:

| Stage | Question | Fail action |
| --- | --- | --- |
| **1 — Spec compliance** | Does each commit satisfy its task `Done when` and REQ IDs? | Send worker back or rewrite task |
| **2 — Code quality** | Harness green, no suppressions, scope matches `Files`? | Fix or revert before merge |

Do not merge until **both** stages pass. This pattern is adapted from [Superpowers subagent-driven-development](https://github.com/obra/superpowers).

### 5. Merge + cleanup

```bash
# orchestrator merges worktrees, runs full harness once
npx @luizsantiago/spec-guardrails workspace-cleanup <feature> --tasks T1,T2 --force
```

### 6. Verify (diamond node)

Fresh verifier context — see `task-graph-engineering.md` diamond pattern.

### 7. Overview

```bash
npx @luizsantiago/spec-guardrails feature-overview <feature> --write
```

## Rules that break parallelism

- Two tasks list the same file → merge into one sequential task
- Worker edits outside `Files` → FAIL batch, escalate
- Skip two-stage review → do not merge

## Next

- [Gates](../gates.md) · [Loop patterns](../loop-patterns.md) · [Ecosystem map](../ecosystem.md)
