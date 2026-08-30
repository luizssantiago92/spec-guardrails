# Ecosystem map

Where Spec Guardrails sits among harness, loop, and graph engineering — and what we deliberately **do not** try to be.

## Layers

| Layer | Examples | Relationship to Spec Guardrails |
| --- | --- | --- |
| **Runtime** (sessions, tools, models, desktop) | DeepCode, harness-foundry | Adjacent — we do not ship a runtime |
| **Operational loops** (cadence, triage, CI, cost) | loop-engineering | Complementary — see [loop-patterns.md](loop-patterns.md) |
| **Spec + gates + memory** | **@luizsantiago/spec-guardrails** | **This package** — skills, `.specs/`, Python gates, [Guarantees matrix](Guarantees-matrix.md) |
| **Code context** (repo graphs, search) | RepoGraph | Optional brownfield plugin — not bundled |

## This package

| Responsibility | Mechanism |
| --- | --- |
| Agree on goals in writing | `.specs/features/*/spec.md`, domains |
| Break work into provable steps | `tasks.md`, `task-graph.md` |
| Stop fake “done” (Brakes mode) | Python gates (`validate-*`, `check-commit`) — see [Guarantees matrix](Guarantees-matrix.md) |
| Fresh verify (Process + Brakes) | `references/validate.md`, independent context |
| Brownfield onboarding | `project-init`, `PROJECT.md`, domain stubs |
| Readiness audit | `doctor` |
| Agent-agnostic core | `.specs/` + CLI + gates; [Architecture](Architecture.md) |

## Adjacent projects (curated)

| Project | Role | Relationship |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | SDD phases, memory | Lineage (CC-BY-4.0) |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | Task DAG + KG course | Task half adapted (MIT) |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | Operational loops | Complementary patterns |
| [loopgate_harness](https://github.com/rxdt/loopgate_harness) | Repo-native agent loop harness | Same layer, different bet — it drives CLI agents in an iteration loop; enforcement ideas adapted (MIT) |
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | Curated index | Taxonomy reference |
| [DeepCode](https://github.com/HKUDS/DeepCode) | Full agent runtime | Adjacent product |
| [RepoGraph](https://github.com/ozyyshr/RepoGraph) | Repo-level code graph | Optional brownfield context (not bundled) |

## What we are not building

- A desktop agent or session runtime (see DeepCode, Cursor, Claude Code)
- Full knowledge-graph pipeline (see graph-engineering KG half)
- SWE-bench research integration (see RepoGraph)

## Further reading

- [Guarantees matrix](Guarantees-matrix.md) — product promises
- [Architecture](Architecture.md) — Core vs adapters
- [loop-patterns.md](loop-patterns.md) — feature vs operational loops
- [brownfield-context.md](brownfield-context.md) — why KG / RepoGraph are deferred
- [credits.md](credits.md) — full attribution list
