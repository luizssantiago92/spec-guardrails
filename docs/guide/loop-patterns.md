# Loop patterns (operational)

The Spec Guardrails governs **feature work**: Specify → Tasks → Execute → Verify.
**Loop engineering** governs **recurring work** on the same repo: triage, CI babysitting, dependency sweeps.

This guide maps when to use each. Patterns below are inspired by the open-source
[loop-engineering](https://github.com/cobusgreyling/loop-engineering) project (MIT) —
we do not ship their CLI; we document the *shape* so you can combine it with Spec Guardrails.

## Two loops, one repo

| Loop type | Trigger | Harness path | Typical cadence |
| --- | --- | --- | --- |
| **Feature** | New capability or change with acceptance criteria | `feature-init` → SDD phases → `archive-feature` | Per feature |
| **Operational** | Repo health, inbox, CI, deps | Skills + optional external loop tools | Hourly → weekly |

Feature loops need specs and gates. Operational loops need **constraints**, **budget**, and **stop rules** so the agent does not burn tokens fixing everything at once.

## Operational patterns (reference)

| Pattern | When | Agent posture | Harness fit |
| --- | --- | --- | --- |
| **Daily triage** | Inbox / issues pile up | Read-only scan → short report | Quick tier; no feature folder unless a fix ships |
| **PR babysitter** | Open PRs waiting on CI | Watch CI, propose minimal fixes | Medium if the fix needs tasks + verify |
| **CI sweeper** | Red main / flaky pipeline | Cautious fixes, one failure at a time | Medium+; discrimination sensor if behavior changes |
| **Dependency sweeper** | Outdated packages | Patch-only bumps, run tests | Simple → Medium |
| **Changelog drafter** | Before release | Summarize merged work | Quick; output is docs only |
| **Post-merge cleanup** | After large merge | Dead code, TODOs, format | Quick unless scope grows |
| **Issue triage** | Backlog grooming | Label, dedupe, propose — no code | Explore / Quick |

Pick one pattern per automation. Mixing “fix CI + upgrade all deps + rewrite auth” in a single loop is how agents lose the plot.

## Guardrails Ready score

Run an audit before relying on Spec Guardrails in production:

```bash
npx @luizsantiago/spec-guardrails doctor
npx @luizsantiago/spec-guardrails doctor --json
npx @luizsantiago/spec-guardrails loop list
```

`doctor` checks skills in all adapter trees, platform entry contracts, gates, config, STATE, optional PROJECT.md, and (for the active feature with 3+ tasks) `task-graph.md`. It prints **Operating modes** with separate **Process** and **Brakes** scores, **Guardrails Ready: N/100**, up to three next actions, and an **Execute hint** (`loop-plan` when tasks are in progress, or `validate-state` when every task is marked complete).

`loop list` shows **operational** patterns (triage, CI sweeper, dependency bumps) — complementary to feature `loop-plan` waves. Use `loop run <id>` to print a structured agent brief.

Inspired by loop-engineering’s Loop Ready score — scoped to **this package’s** install surface, not their full foundry stack.

## Combining with external loop tools

Optional external tools (not bundled):

- [loop-engineering](https://github.com/cobusgreyling/loop-engineering) — `loop init`, `loop doctor`, patterns, cost estimator
- [harness-foundry](https://github.com/cobusgreyling/harness-foundry) — versioned harness runtime (sessions, traces)

Use **Spec Guardrails** for spec memory and gates; use **loop-engineering** when you want scored operational scaffolding on top.

## Credits

- [loop-engineering](https://github.com/cobusgreyling/loop-engineering) (MIT) — operational loop patterns and Loop Ready metaphor
- [Addy Osmani — Loop engineering](https://addyosmani.com/blog/loop-engineering/) — essay lineage

See also [ecosystem.md](ecosystem.md) and [credits.md](credits.md).
