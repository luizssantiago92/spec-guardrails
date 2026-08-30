# Glossary

Short definitions for terms used across Spec Guardrails docs and skills.

| Term | Meaning |
| --- | --- |
| **Hub** | `agent-architecture.md` — the always-on router: contract, phase map, complexity tiers, gate schedule |
| **Phase reference** | One file under `references/` loaded per turn (e.g. `specify.md`, `implement.md`) |
| **Sister skill** | Cross-cutting skill loaded on demand (`security-review.md`, `task-graph-engineering.md`, …) |
| **Gate** | Python script (or CLI wrapper) with exit code 0 = pass, non-zero = stop |
| **Brakes mode** | Node + Python 3.10+ — gates run automatically at phase boundaries |
| **Process mode** | Node only — same phases; agent performs checklists manually when Python is absent |
| **Tier** | Complexity class (Quick / Simple / Medium / Complex / Parallel) from `classify-change` |
| **Wave** | One Execute iteration: pick runnable tasks → test → implement → commit |
| **Brief** | `requirements-brief.md` from `/elicit` — gaps and decisions before Specify |
| **Brief approval** | Human sign-off on the requirements brief before `/specify` |
| **Traceability** | REQ id → task id → validation evidence on the same coverage line |
| **Quality checks** | Commands under `quality.checks` in `.specs/config.yaml`, run via `quality-checks` during `/verify` |
| **Suppression** | Linter/test bypass (`# noqa`, `eslint-disable`, `@ts-ignore`, …) — blocked by `check-suppressions` |

## Related

- [Concepts](concepts.md) — spec-driven loop and complexity tiers in depth
- [Gates reference](gates.md) — when each gate runs
- [Guarantees matrix](Guarantees-matrix.md) — what the product promises vs guides
