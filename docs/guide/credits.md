# Credits and lineage

Spec Guardrails combines adapted ideas from several open-source projects. This page separates **what we ship in the npm package** from **research and adjacent tools we cite but do not bundle**.

---

## Shipped in `@luizsantiago/spec-guardrails`

These projects directly influenced **skills, gates, `.specs/` layout, or CLI behavior** that consumers install.

### Core process and memory

| Source | License | What we use (concrete) |
| --- | --- | --- |
| [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/tree/main/packages/skills-catalog/skills/(development)/tlc-spec-driven) | CC-BY-4.0 | Spec → tasks → execute → verify phase model; `.specs/features/`, `STATE.md`, spec/task markdown shapes; gate “brakes” philosophy |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | Discuss-phase patterns (options A/B/C, decision records); definition-of-done framing in verify/archive |

### Task graph and parallel Execute

| Source | License | What we use (concrete) |
| --- | --- | --- |
| [graph-engineering](https://github.com/codejunkie99/graph-engineering) | MIT | `task-graph-engineering.md` rules: one file owner per wave, stop rule, fake-edge detection; `validate-tasks` structural checks aligned with graph hygiene |

### Loop patterns and readiness

| Source | License | What we use (concrete) |
| --- | --- | --- |
| [loop-engineering](https://github.com/cobusgreyling/loop-engineering) | MIT | Execute wave model; operational vs feature loops documented in [loop-patterns.md](loop-patterns.md) |
| [Addy Osmani — Loop engineering](https://addyosmani.com/blog/loop-engineering/) | Essay | Referenced in loop-patterns guide for loop taxonomy |
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | CC0 | Ecosystem positioning vocabulary (harness vs app); not copied as code |

---

## Referenced, not vendored

We mention these for context or future plugins. **No code from these repos ships in the package today.**

| Source | Why it appears in docs |
| --- | --- |
| [DeepCode](https://github.com/HKUDS/DeepCode) | Example of agent harness + loop runtime (separate product category) |
| [RepoGraph](https://github.com/ozyyshr/RepoGraph) | Brownfield code-graph direction; we ship lightweight `code-index` instead |
| Google DeepMind × MIT — [Scaling Agent Systems](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/) | Cited in task-graph material for stop-rule research |
| [npubird/KnowledgeGraphCourse](https://github.com/npubird/KnowledgeGraphCourse) | SEU graduate KG course; English distillation notes for graph-engineering lineage |

---

## Original work in this repository

Beyond adaptations above, this package adds:

- Node CLI (`install`, `doctor`, `feature-init`, memory-index, execution policy, req-analysis, …)
- Python structural gates under `scripts/` (installed to `.specs/guardrails/scripts/`)
- Platform adapters (Cursor, Claude, Copilot, Codex, `AGENTS.md`)
- Cursor hooks templates (optional — opt-in via `install --with-cursor-hooks`)
- Elicitation phase (`/elicit`, requirements briefs, `validate-req-analysis`)

---

## How to cite

If you publish work that builds on Spec Guardrails, credit **`@luizsantiago/spec-guardrails`** and the upstream projects in the **Shipped** table when your work reuses their patterns.

When adding new borrowed patterns to the kit, extend this file and the README Credits table in the same PR.
