# Restart PRD Seed — Single-Package Agent Governance

Use this document as the initial `prd.md` when rebooting the product under a **new name** with a clean repository. It captures only what the mature Spec Guardrails lineage proved valuable — without companion bundles, Atlas pairing, or experimental multi-package sprawl.

Replace `[PRODUCT_NAME]` with your chosen name before starting.

---

## Goal

Build **`[PRODUCT_NAME]`** — a governance, evidence, verification, and controlled-execution layer for agentic software development.

An AI coding agent should:

1. plan before acting;
2. work from explicit specifications and approved tasks;
3. prove each artifact is ready before advancing;
4. operate within explicit boundaries (budget, scope, retries);
5. execute parallel work safely in isolated workspaces;
6. preserve project knowledge across sessions (`.specs/` files + lessons);
7. produce evidence for completion;
8. be independently verified (fresh context).

---

## Problem

Agents ship “looks good” with thin specs, missing evidence, shared mutable trees during parallel work, and the same context that wrote the code declaring victory.

---

## Non-goals (explicit)

- Not a desktop agent runtime (Cursor, Claude Code, etc. remain the runtime)
- Not a companion/ecosystem bundle (no Tech Atlas, fullstack-floor-map, agentic-fullstack pairing)
- Not a knowledge-graph database or vector store in v1 (SQLite/KG deferred to roadmap)
- Not dozens of shallow agent integrations before a stable adapter contract
- Not replacing human-readable `.specs/` artifacts with a database as source of truth

---

## Product scope (v1 — ship this)

### Core workflow (Process + Brakes)

| Phase | Mechanism |
| --- | --- |
| Explore / Specify | Hub skill + `spec.md` + `validate-spec` gate |
| Discuss / Design | Optional `design.md`; cross-artifact `analyze-artifacts` |
| Tasks | `tasks.md` + `task-graph.md` + `validate-tasks` |
| Execute | `loop-plan` waves; optional sub-agents; one writer per file |
| Validate / Verify | `validate-state`; fresh-context `validate.md` protocol |
| Memory | `STATE.md`, `lessons.json` / `LESSONS.md`, domain stubs |
| Archive | `archive-feature` folds verified work into domains |

### P0 governance (proven in 3.2 lineage)

| Capability | Implementation |
| --- | --- |
| **Artifact gates** | Python structural gates with **blocking / warning / info** severity |
| **Parallel waves** | `loop_plan.py` — disjoint `Files` → parallel groups |
| **Workspace isolation** | `workspace-prepare` / `workspace-cleanup` — git worktrees under `.specs/workspaces/` |
| **Execution policy** | `.specs/config.yaml` — budget, scope, escalation; `execution-policy` CLI |
| **Evidence** | Test file:line citations; discrimination sensor on Medium+ verify |
| **Lessons** | Grounded FAIL-only loop; candidate → confirmed; no auto-rules |

### Agent adapters (v1)

Ship install targets for:

- Cursor (`.cursor/skills/`, `.cursorrules`, rules)
- Claude Code (`.claude/skills/`, `CLAUDE.md`)
- GitHub Copilot (`.github/skills/`, `copilot-instructions.md`)
- OpenAI Codex (`.codex/skills/`, `AGENTS.md`)
- Root `AGENTS.md` open standard

Core (`.specs/`, CLI, Python gates) remains agent-agnostic.

### CLI surface (minimum)

```
install | init-config | project-init | feature-init | archive-feature
doctor | classify-change | feature-status | phase-context
validate-spec | validate-tasks | validate-state | validate-traceability | validate-quick
analyze-artifacts | check-commit | loop-plan | lessons
workspace-prepare | workspace-cleanup
execution-policy status | check-path | record-retry
```

---

## Roadmap (v2+ — do not block v1)

From the strategic upgrade plan — implement only after v1 is stable and dogfooded:

| Priority | Capability |
| --- | --- |
| P1 | Agent adapter abstraction (capability model) |
| P1 | SQLite memory index (rebuildable from artifacts) |
| P1 | SQLite-backed knowledge graph (entities + relations) |
| P1 | Lesson graduation (observation → approved rule) |
| P1 | Intent/effect policy (beyond path allowlists) |
| P2 | Contextual automatic guards |
| P2 | Solution exploration mode |
| P2 | Optional semantic retrieval |

---

## Architecture principles

```text
SPECIFICATION → ARTIFACT QUALITY → AUTHORIZED EXECUTION → SAFE PARALLELISM
→ PROJECT MEMORY → EVIDENCE → INDEPENDENT VERIFICATION → TRUSTED RESULT
```

- **Human-readable artifacts** are the durable source of record under `.specs/`.
- **Gates** are structural and deterministic (Python 3.10+); warnings do not block unless `--strict`.
- **Parallelism** never shares a mutable working tree — use worktrees or sequential execution.
- **Policy** communicates uncertainty; soft enforce via CLI + skills until OS sandbox exists.

---

## Acceptance criteria (v1 done)

### AC-001: Install and doctor

WHEN a developer runs `npx @[scope]/[PRODUCT_NAME] install`  
THEN skills, gates, and `.specs/` scaffold land in the project  
AND `doctor` reports Process and Brakes scores with actionable next steps.

### AC-002: Spec gate blocks thin specs

WHEN `validate-spec` runs on a spec missing acceptance criteria  
THEN the gate exits non-zero with at least one **blocking** finding.

### AC-003: Parallel wave isolation

WHEN `loop-plan` returns a parallel group with 2+ tasks  
AND `workspace-prepare` runs for those task ids  
THEN each task receives an isolated git worktree under `.specs/workspaces/`  
AND `workspace-cleanup` removes worktrees without corrupting the main tree.

### AC-004: Execution policy

WHEN `.specs/config.yaml` denies `secrets/**`  
AND `execution-policy check-path secrets/key` runs  
THEN the CLI exits non-zero with a blocking scope violation.

### AC-005: Independent verify

WHEN Execute completes  
THEN the agent MUST run `/verify` in a fresh context  
AND `validate-state` requires evidence citations before PASS.

---

## Credits and influences

Document honestly — inspiration, not code copying unless licensed:

| Source | What we learned |
| --- | --- |
| **Spec Guardrails** (`@luizsantiago/spec-guardrails`) | Direct lineage — gates, `.specs/`, loop-plan, verify protocol |
| **tlc-spec-driven** (Tech Leads Club, CC-BY-4.0) | SDD phase structure and memory patterns |
| **graph-engineering** (MIT) | Task DAG / wave orchestration concepts |
| **loop-engineering** (MIT) | Operational loop metaphors; doctor readiness scoring |
| **GitHub Spec Kit** | Spec-driven workflow positioning (differentiation, not clone) |
| **Agent SDK permission models** | Blast-radius and escalation thinking |

Do **not** claim features from external repos unless verified against their current state and license.

---

## Roadmap P1 / P2 (same repo — no reboot required)

Continue on the **Spec Guardrails** repository. The items below ship incrementally on `main` — not via a new repo or rename:

| Phase | Capability | Status in 3.2.1 |
| --- | --- | --- |
| P1 | Lesson graduation lifecycle | Shipped (`promote`, `graduate`) |
| P1 | Adapter registry abstraction | Shipped (`lib/adapter-registry.js`) |
| P1 | SQLite memory index + rebuild | Shipped (`memory-index rebuild`) |
| P1 | Knowledge graph traversal | Shipped (`memory-query --from …`) |
| P1 | Intent/effect policy (READ/WRITE/DELETE) | Shipped (`check-path --op`, `effects` config) |
| P2 | Contextual auto-guards | Planned |
| P2 | Solution exploration | Planned |
| P2 | Semantic retrieval | Planned |

Use this seed as a **product north star**, not a migration checklist. For day-to-day work, stay on `@luizsantiago/spec-guardrails` and ship small semver releases.

---

## Legacy: forking under a new product name

If you fork under a new name (optional — not required for P1):

1. Rename package, CLI bin, display strings, and hub markers.
2. Remove all Atlas/companion code paths (already done in 3.2.0 source).
3. Keep `skills/` as source of truth; run `install` to refresh adapters.
4. Reset CHANGELOG with v1.0.0 — do not carry 300-commit narrative into the new repo marketing.
5. Use this file as `prd.md` / product brief; derive `spec.md` features from AC-001…005.

---

## Success metrics

- Agents cannot casually advance with incomplete specs (gate blocks).
- Parallel Execute does not rely on multiple agents in one mutable tree.
- Completion requires verifiable evidence, not self-report.
- Fresh verify catches gaps the implementer missed.
- Repository churn stays low — one package, one identity, focused releases.
