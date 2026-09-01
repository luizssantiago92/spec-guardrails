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
| Feature dashboard | `feature-overview` → `overview.md` (REQ → task → evidence) |
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
| [github/spec-kit](https://github.com/github/spec-kit) | Official SDD CLI + integrations | Same problem space — we add Brakes gates and `.specs/` memory; see [tutorials](tutorials/README.md) |
| [dceoy/speckit-agent-skills](https://github.com/dceoy/speckit-agent-skills) | Spec Kit skills + CI regeneration | Reference for multi-platform skill trees |
| [alfredoperez/speckit-companion](https://github.com/alfredoperez/speckit-companion) | VS Code spec workspace UI | Complementary — we ship `feature-overview` markdown instead |
| [obra/superpowers](https://github.com/obra/superpowers) | Auto-trigger skills + subagent workflow | Two-stage batch review pattern adapted in `sub-agents.md` |
| [anthropics/skills](https://github.com/anthropics/skills) · [google/skills](https://github.com/google/skills) | Agent Skills standard + catalogs | Portable `SKILL.md` format; scan third-party packs with SkillSpector |
| [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) | Skill security scanner | Recommended before installing untrusted skills — see `security-review.md` |
| [NVIDIA/SkillEvaluator](https://github.com/NVIDIA/skillevaluator) | Skill publication eval harness | Complementary QA for skill authors |
| [coze-dev/coze-loop](https://github.com/coze-dev/coze-loop) | Agent ops platform (eval, traces, prompts) | Adjacent — runtime observability, not repo-local SDD |
| LangSmith / similar | Live LLM traces and eval in prod | Adjacent — we version **contracts** in git (`AI Surface`), not production telemetry |
| [kkawailab/speckit-tutorial](https://github.com/kkawailab/speckit-tutorial) | Progressive Spec Kit tutorials | External onboarding reference |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | Curated LLM app index | Discovery only |

## Python platform teams (4.7+)

| We do | We do not |
| --- | --- |
| `python-platform` preset + Ship/AI Surface in `design.md` | Replace LangSmith / Coze Loop live traces |
| `validate_ship_surface` — structural gate before Verify | Run `terraform plan` security review or cost analysis |
| Connect `/elicit`, memory, lessons to AI kickoffs | Guarantee eval quality — only that a harness is documented |
| Tutorial 04 + appendices (FastAPI, Django, worker, RAG) | Ship framework-specific presets |

Guide: [python-platform.md](python-platform.md)

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
