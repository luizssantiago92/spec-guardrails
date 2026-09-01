# Tutorial 2 — Medium feature (spec → tasks → verify)

**Goal:** Walk the full governed path with owner approvals on spec and tasks.

**Time:** ~45 minutes  
**Tier:** Medium (real feature, under ~10 tasks)

## Scenario

Add a "remember me" checkbox to login that extends session TTL when checked.

## Steps

### 1. Kick off

```bash
npx @luizsantiago/spec-guardrails feature-init "remember me on login"
```

In chat:

> Specify remember-me: when the user checks the box, session cookie TTL is 30 days; unchecked stays 24 hours. Out of scope: social login.

### 2. Approve the spec

Agent drafts `spec.md` with `SHALL`/`MUST` criteria and `## Assumptions`.

Before you approve:

```bash
python3 .specs/guardrails/scripts/validate_spec.py <feature>
```

Say **yes** only when the gate passes and the acceptance criteria are testable.

### 3. Tasks + analyze

Agent produces `tasks.md`. Before approval:

```bash
python3 .specs/guardrails/scripts/analyze_artifacts.py <feature>
python3 .specs/guardrails/scripts/validate_tasks.py <feature>
```

Each task needs: Requirement, Files, Depends on, Tests, Gate, Done when.

### 4. Execute in waves

```bash
npx @luizsantiago/spec-guardrails loop-plan <feature>
```

Agent implements test-first, one atomic commit per task.

### 5. Independent verify

Open a **fresh chat** (author ≠ verifier):

> Verify feature `<feature>` against the spec. Run security review if session/auth changed.

Gates:

```bash
python3 .specs/guardrails/scripts/validate_traceability.py <feature>
python3 .specs/guardrails/scripts/validate_state.py <feature>
python3 .specs/guardrails/scripts/run_quality_checks.py
```

### 6. Dashboard

```bash
npx @luizsantiago/spec-guardrails feature-overview <feature> --write
```

Open `.specs/features/<feature>/overview.md` — REQ → task → test evidence table.

### 7. Archive

After `Verdict: PASS`:

```bash
npx @luizsantiago/spec-guardrails archive-feature <feature>
```

## Drift mid-Execute?

If implementation diverged from tasks, run **Converge** (`references/converge.md`) before verify — append missing tasks, never delete completed checkboxes.

## Next

[03 — Parallel worktrees](03-parallel-worktrees.md)
