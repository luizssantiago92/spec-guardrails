# Tutorial 1 — Quick fix (express lane)

**Goal:** Ship a tiny, localized change with evidence — no full spec ceremony.

**Time:** ~20 minutes  
**Tier:** Quick (≤3 files, no new dependency, no auth/payments)

## Scenario

Fix a typo in a user-visible error message and add a regression test.

## Steps

### 1. Install (once per project)

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

### 2. Classify in chat

Tell your agent:

> Quick fix: the login form shows "Invlaid password" — fix the copy and add a test that the message is correct. No auth logic changes.

The agent should run `classify-change` and load `references/quick-mode.md`.

### 3. Scaffold (optional but recommended)

```bash
npx @luizsantiago/spec-guardrails feature-init "fix login typo"
```

Quick mode can skip a full `spec.md`, but a feature folder keeps evidence in `.specs/features/<feature>/`.

### 4. Implement + gates

For each commit the agent must run:

```bash
python3 .specs/guardrails/scripts/check_suppressions.py
python3 .specs/guardrails/scripts/check_commit.py --staged
```

### 5. Close with quick evidence

```bash
python3 .specs/guardrails/scripts/validate_quick.py <feature>
```

### 6. Check status

```bash
npx @luizsantiago/spec-guardrails feature-overview <feature> --write
```

## What you should see

- No `design.md` or `task-graph.md`
- `validation.md` or quick evidence under `.specs/features/<feature>/`
- `doctor` still 100/100 when Python is available

## When Quick is wrong

If the agent needs a fourth file, a new dependency, or touches auth — stop and restart as a **Medium** feature ([Tutorial 2](02-medium-feature.md)).

## Next

[02 — Medium feature](02-medium-feature.md)
