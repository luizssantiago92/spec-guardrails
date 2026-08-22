# Gates reference — how automatic brakes work

Gates are **Python scripts** in `.specs/guardrails/scripts/`. The agent (or you) runs them at phase boundaries.

**Product view:** which guarantee each gate serves → [Guarantees matrix](Guarantees-matrix.md).

**Exit code 0** = pass. **Non-zero** = stop, fix the artifact, re-run. Gates do not replace your judgment — they block **structural** gaps (empty specs, fake done, bad commit titles).

## Pipeline placement

| Phase | Order | Gate / CLI |
| --- | ---: | --- |
| **Planning** | 1 | `feature-init` (CLI) |
| | 2 | `validate-spec` |
| | 3 | `analyze-artifacts` |
| | 4 | `validate-tasks` |
| | 4b | `validate-traceability` (REQ ↔ tasks; again when `validation.md` exists) |
| **Building** | 5 | `loop-plan` → implement → `check-commit` (repeat per wave) |
| **Closing** | 6 | `validate-traceability` (full coverage lines) → `validate-state` |
| | 7 | `archive-feature` (CLI) |
| | — | `lessons` (after Verify FAIL) |

## Gate catalog

| Gate | Script / CLI | When | What it checks |
| --- | --- | --- | --- |
| **validate-spec** | `validate_spec.py` | Before you approve `spec.md` | Required sections, `SHALL`/`MUST` criteria, assumptions |
| **analyze-artifacts** | `analyze_artifacts.py` | Before task approval; on drift | Every REQ has task coverage; no orphan tasks |
| **validate-tasks** | `validate_tasks.py` | Before you approve `tasks.md` | Task shape, binary done criteria, `task-graph.md` when 3+ tasks, file overlap |
| **validate-traceability** | `validate_traceability.py` | After tasks; again with `validation.md` | REQ → tasks → same-line coverage evidence (structural only) |
| **validate-quick** | `validate_quick.py` | End of `/quick` | TASK.md / SUMMARY.md shape; ≤3 files; no sensitive paths |
| **loop-plan** | `loop_plan.py` | Start of each `/loop` wave | Next runnable tasks; parallel groups (disjoint files) |
| **check-commit** | `check_commit.py` | Every commit | Conventional Commits shape |
| **validate-state** | `validate_state.py` | Before declaring feature done | PASS verdict, evidence cites `file:line`, no open gaps |
| **lessons** | `lessons.py` | After Verify FAIL | Grounded lessons only — no self-declared wisdom |
| **archive-feature** | CLI | After Verify PASS | Merges feature into domain memory |

## How a gate run works

| Step | What happens |
| ---: | --- |
| 1 | Agent writes or updates the artifact (e.g. `spec.md`) |
| 2 | Agent runs `python3 .specs/guardrails/scripts/validate_spec.py <feature>` |
| 3 | **Exit 0** → OK, present to you for approval |
| 4 | **Exit 1** → STOP, fix listed issues, re-run (no Tasks/Execute until pass) |

### Arguments

Most gates accept:

- Feature name (`001-auth`)
- Feature directory (`.specs/features/001-auth`)
- Path to artifact (`spec.md`, `tasks.md`)

With **one** feature in the repo, the argument is optional. With **several**, the gate lists candidates and exits **2** until you pick.

### Degraded mode

If Python is unavailable, the agent performs the **same checklist manually** by reading the artifact against the reference procedure. The standard does not drop — only who runs the check changes.

## What gates block vs guide

| Hard block (script) | Guided only (skills) |
| --- | --- |
| Missing spec sections | How deep a discussion went |
| Empty code stubs | Perfect prose in every section |
| Tasks without REQ coverage | “Enough” product taste |
| Fake PASS without test paths | Whether a test is clever |

Freeze policy for maintainers: [Gates and guarantees](Gates-and-guarantees.md) · [ADR 0001](../adr/0001-harness-freeze-v0.7.md).

## Running gates yourself

```bash
npx @luizsantiago/spec-guardrails validate-spec auth
npx @luizsantiago/spec-guardrails validate-tasks auth
npx @luizsantiago/spec-guardrails loop-plan auth --json
npx @luizsantiago/spec-guardrails validate-state auth
npx @luizsantiago/spec-guardrails check-commit --message "feat(auth): add session"
npx @luizsantiago/spec-guardrails lessons list --status confirmed
```

`doctor` checks that scripts exist, Python works, and suggests `loop-plan` when Execute is next.

## Related

- [Concepts](concepts.md) — where gates sit in the guardrails model
- [Agent commands](agent-commands.md) — which command triggers which gate
- [Skills and hub](skills-and-hub.md) — hub gate schedule table
