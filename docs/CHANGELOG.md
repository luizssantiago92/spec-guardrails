# Changelog

Version history for `@luizsantiago/spec-guardrails`. Upgrade steps: [Migration](guide/Migration.md). Name freeze: [Stability policy](guide/Stability-policy.md).

## Unreleased

—

## 4.5.1 — Gate encoding fix + attribution

### Fixed

- **README illustrations** — rewritten as proxy-safe SVG: explicit pixel `width`/`height` instead of `width="100%"`, no `<style>` block, no CSS custom properties, no `prefers-color-scheme`, no animation, and ASCII-only text. The previous versions relied on features that image-rasterizing proxies (such as the one npm uses for README images) cannot resolve, so the images did not render on the npm package page; the mojibake introduced while writing the files (`d3 files`, `25 files`, `2’5`) is gone as well
- **`check-suppressions` / `check-commit --staged` / `quality-checks`** — subprocess output is decoded as UTF-8 with replacement, so the gates no longer crash with `AttributeError` on Windows when the staged diff or a test runner emits bytes outside the platform locale (4.5.0 shipped SVG assets and em dashes that triggered it)
- **Attribution** — credits [loopgate_harness](https://github.com/rxdt/loopgate_harness) (MIT) for the enforcement and presentation ideas adopted in 4.5.0, in the README table, [credits](guide/credits.md), and [ecosystem](guide/ecosystem.md); notes that `tlc-spec-driven` declares CC-BY-4.0 at skill level while its repository ships MIT
- **README** — `Garantees matrix` typo in the gates section
- **Repository hygiene** — untracked leftover maintainer scratch files (`.commit-msg.txt`, `.pr-body.md`) and added them to `.gitignore`

### Changed

- **Hub (`agent-architecture.md`)** — gate table lists `check_suppressions.py` and `run_quality_checks.py`, and `validate_req_analysis.py` moved from the sister-skill column to the gate column for Elicit, so the agent is actually told to run the 4.5.0 gates
- **Docs index** — lists `ecosystem.md`

## 4.5.0 — README visuals + enforcement gaps

### Added

- **README illustrations** — `.assets/banner.svg`, `flow.svg`, and `tiers.svg` with light/dark theme support
- **`check-suppressions`** — blocks staged diffs that add `# noqa`, `eslint-disable`, `@ts-ignore`, skipped tests, or `--no-verify` (configurable via `suppressions.patterns`)
- **`quality-checks`** — runs commands listed under `quality.checks` in `.specs/config.yaml` during `/verify`
- **`check-commit --staged`** — rejects empty commits and oversized staged diffs (`commit.max_staged_lines`)
- **[Glossary](guide/Glossary.md)** — short definitions for hub, gate, tier, wave, brief, and related terms

### Changed

- **Install next steps** — message names the detected platform and mentions `--all-platforms` instead of implying every adapter tree is installed
- **README** — visual flow and tiers diagrams, CI/downloads badges, honest limits section, two new gates in the kit table
- **`templates/config.yaml.example`** — documents `suppressions`, `quality.checks`, and `commit.max_staged_lines`

## 4.4.0 — Platform-aware install + hygiene

### Added

- **Platform detection on `install`** — detects Cursor, Claude Code, GitHub Copilot, or OpenAI Codex from environment markers and repo layout; installs skills and adapter entry files only for the detected platform
- **`install --all-platforms`** — previous behavior (all four skill trees); useful for CI and multi-agent repos
- **`install --platform <id>`** — force `cursor`, `claude`, `copilot`, or `codex` instead of auto-detect (existing trees are still refreshed)
- **Migration preserve** — existing skill trees (hub present) are refreshed even when switching IDEs, so returning to a prior agent keeps its tree up to date
- **`memory-index status [--json]`** — documented in CLI help (already supported by the Python gate)

### Changed

- **`doctor`** — skills-hub and platform-adapters checks target installed platforms only, not every tree
- **Docs** — gates catalog includes `validate-req-analysis`; skills index lists `elicitation.md` and `solution-exploration.md`; Migration documents all four skill trees and 4.4 install behavior
- **`templates/config.yaml.example`** — sandbox deny patterns aligned with runtime defaults

### Removed

- **`lib/memory-index.js`** — unused Node wrapper (CLI routes through `gates.js` + Python scripts)

## 4.3.0 — Cursor hooks removed

### Removed

- **Cursor IDE hooks** — automatic scope and shell checks via `.cursor/hooks.json` and shipped hook scripts (`context-guard-edit.mjs`, `sandbox-shell.mjs`). Motivation: each edit/shell action spawned short-lived Node processes (especially heavy on Windows with `npx`), with limited benefit because hooks were opt-in and fail-open
- **`install --with-cursor-hooks` / `--without-cursor-hooks`** — removed from help; flags accepted as no-op with deprecation warning for compatibility
- **`cursor.hooks` config block** — removed from config template
- **Docs** — deleted Cursor hooks and sandbox guide; removed hook sections from hub, elicitation, FAQ, Overview, and doc index

### Changed

- **`install`** — runs idempotent legacy cleanup: removes shipped hook scripts, strips shipped entries from `.cursor/hooks.json` (preserves user hooks), deletes empty `hooks.json`, removes `cursor:` block from config
- **`context-guard` and `sandbox` CLI** — unchanged; agent runs these at phase boundaries instead of IDE auto-triggers

## 4.2.1 — npm description and publish trigger

### Changed

- **npm description** — leads with positioning instead of a feature list: the agent writes the spec, gets approval, builds in waves, and proves the result; runtime requirements and release notes moved out

### Fixed

- **`publish.yml`** — dropped the `release: published` trigger, which could never succeed: the `npm` environment allows the `main` branch only, so a release event running on the tag ref was rejected before any step executed. Creating a GitHub release no longer starts a failing publish run; publishing stays manual from `main`
- **`publish.yml`** — removed the release-only tag validation step and the now-dead `workflow_dispatch` conditionals

## 4.2.0 — Cursor hooks opt-in (off by default)

### Changed

- **`install`** — Cursor hooks are **not** registered unless `--with-cursor-hooks` or `cursor.hooks: true` in `.specs/config.yaml`
- **`install --without-cursor-hooks`** — removes shipped hook entries and sets `cursor.hooks: false`
- **`/elicit`** — may ask once (Cursor) whether to enable IDE hooks; hub documents chat enable/disable
- **Docs** — Cursor hooks and sandbox guide, FAQ, Overview, config template, Migration, GETTING_STARTED, and doc index updated for opt-in default; fixed stale README anchor links

## 4.1.1 — README rewrite for first-time readers + npm description

### Changed

- **README** — install explains Python as optional (Node-only works; Python adds automatic proof); user-experience flow, five complexity tiers with artifacts/approvals, concrete kit inventory (12 artifacts, 28 skills, 9 gates, 6 memory commands), optional capabilities off by default
- **README** — requirements analysis guide linked; hooks cited as optional item, not a dedicated section
- **Docs** — [Requirements analysis](guide/requirements-analysis.md) guide for `/elicit` and requirements briefs
- **npm description** — ≤350 characters; hooks optional and tunable

## 4.1.0 — Elicitation wave 2 (gate + context)

### Added

- **`validate-req-analysis` gate** — structural checks on requirements briefs before `/specify`
- **`req-analysis validate`** and **`req-analysis context`** — CLI wrappers for the gate and kickoff/brief bundle
- **`req_context.py`** — read-only context assembler for Specify
- **Docs** — Cursor hooks and sandbox guide: IDE behavior, symptoms, tuning, performance (guide removed in 4.3.0)

### Changed

- **`classify-change`** — suggests `/elicit` when description language is vague (never blocks `/specify`)
- **Hub** — Elicit phase lists `validate-req-analysis` gate
- **Overview**, **FAQ**, **README**, **agent commands** — cross-links to hooks guide; `elicitation.md` references gate
- **CI** — verifies `skills/references/elicitation.md` exists

## 4.0.0 — Elicitation phase (`/elicit`) wave 1

### Added

- **`/elicit` phase** — `references/elicitation.md`: structured requirements discovery before `/specify` (project or feature scope); suggest-only router, never blocks Specify
- **`req-analysis` CLI** — `init`, `discover`, `promote` scaffolds `.specs/project/requirements-brief.md` and feature briefs
- **Kickoff indexing** — `memory-index rebuild` indexes `prd.md`, `.specs/project/kickoff.md`, requirements briefs, and feature briefs
- **Docs** — three entry paths in [Overview](guide/Overview.md); `/elicit` vs `/analyze` clarified in [agent commands](guide/agent-commands.md)

### Changed

- **Hub** — phase map includes optional Elicit; Specify reads approved requirements briefs when present
- **README** — **4.0.x** series

## 3.9.0 — Roadmap complete: episodes, code index, sandbox policy

### Added

- **Episodic memory lifecycle** — `episodes record|list|archive|prune|promote` with store at `.specs/state/episodes.json`; indexed by `memory-index rebuild`
- **Lightweight code index** — `code-index rebuild|search` for brownfield navigation (shallow file/symbol map, not RepoGraph)
- **Soft OS sandbox** — `sandbox status|check-command` with configurable deny patterns (`off|warn|strict`)
- **Cursor sandbox hook** — `beforeShellExecution` runs sandbox checks automatically on install

### Changed

- **Config example** — `memory.lifecycle` and `sandbox` blocks documented
- **Roadmap** — P2+ optional waves marked shipped; strategic roadmap complete for core package

## 3.8.0 — Cursor hooks for automatic context-guard

### Added

- **Cursor hooks** — `install` ships `.cursor/hooks.json` + `context-guard-edit.mjs` to run `context-guard check-edit` before Write/StrReplace/edit tools
- **`lib/cursor-hooks.js`** — idempotent hook install and hooks.json merge (preserves user hooks)
- **Tests** — hook path extraction, merge logic, install copies hook assets

### Changed

- **Hub** — notes Cursor auto-guard on file edits via hooks

## 3.7.0 — Memory polish + plain-language docs

### Added

- **Plain-language docs** — [Overview](guide/Overview.md) and [Memory](guide/Memory.md); simplified README and guide index
- **Doctor memory hints** — suggests `memory-index rebuild` / `embed` when the index is missing, stale, or semantic is enabled without embeddings
- **`memory-index status --json`** — chunk, embedding, and staleness stats for tooling and doctor
- **More indexed chunks** — `design.md` and per-task bodies in `tasks.md` join spec, validation, and exploration in search

### Changed

- **`memory-index rebuild`** — preserves embeddings when chunk text is unchanged (prunes orphans and stale hashes instead of wiping all embeddings)
- **npm description** — shorter product definition (≤350 characters)

## 3.6.0 — Hybrid memory retrieval + optional semantic embeddings

### Added

- **Chunk index** — `memory-index rebuild` indexes requirement bodies, validation, exploration, and approved lessons (not just entity metadata)
- **`memory-search` v2** — FTS over artifact chunks with entity fallback
- **`memory-retrieve`** — hybrid ranked package (FTS + graph expansion + optional semantic fusion)
- **`memory-index embed`** — optional embeddings (`provider: none|hash|openai|ollama`; default semantic **off**)
- **Config block** — `memory.retrieval` in `.specs/config.yaml` example

## 3.5.0 — Solution exploration mode

### Added

- **`solution-explore`** — explicit multi-candidate exploration from an approved spec: `init`, `status`, `validate`, `select` (isolated worktrees + `exploration.md` comparison matrix)
- **`references/solution-exploration.md`** — phase procedure for architecture/strategy forks before Execute
- **Guarantees matrix** — row for explicit solution exploration

## 3.4.0 — P2 contextual guards + FTS retrieval

### Added

- **`context-guard`** — contextual enforcement at Execute boundaries: `status`, `check-edit`, `check-complete` (STATE, tasks, scope, task Files, validation PASS)
- **`memory-search`** — FTS5 full-text search over `.specs/memory/memory.db` (foundation before optional embeddings)
- **Guarantees matrix** — row for contextual guards at edit/complete

## 3.3.0 — Intent/effect policy

### Added

- **Intent/effect classification** — `execution-policy check-path` accepts `--op read|write|delete` and infers operation from path when omitted
- **`effects` config block** — per-operation deny/warn globs (`deny_delete`, `warn_write`, …) in `.specs/config.yaml`
- **Default guard** — DELETE denied under `**/.git/**` unless overridden

## 3.2.1 — P0 parity + P1 foundations

### Fixed

- **`execution-policy record-retry`** — refuses to increment when `max_retries_per_task` is exhausted (exit 1)
- **`execution-policy check-path`** — honors `escalation.on_policy_violation: warn` (exit 0 with warning)
- **Delta specs** — `validate-spec` validates Out of Scope boundaries on delta specs too

### Added

- **`execution-policy record-run`** — increments `agent_runs` with budget enforcement
- **`workspace-list`** — list isolated git worktrees for a feature
- **Hub/docs parity** — worktrees, execution policy, and memory CLIs documented in hub, agent-commands, git-handoff, Guarantees matrix
- **Gate warnings** — `analyze-artifacts` warns on missing `design.md` and verify plan for Medium+ features (5+ tasks)
- **Lesson graduation** — lifecycle `observed → repeated → candidate → approved → graduated`; CLI `promote`, `graduate`
- **Adapter registry** — `lib/adapter-registry.js` decouples platform install from core
- **SQLite memory index** — `memory-index rebuild` and `memory-query --from <id>` over `.specs/memory/memory.db`

## 3.2.0 — Single package + strategic P0

### Breaking / removal

- **Removed Atlas companion integration** — no `.specs/companions/INDEX.json` probes in `doctor`; companion docs and preserve-path logic removed. Spec Guardrails is a single product again.

### Added

- **Artifact gate severity labels** — gate output uses `blocking`, `warning`, and `info`; spec gate warns on empty Out of Scope and ambiguous acceptance criteria
- **Workspace isolation** — `workspace-prepare` / `workspace-cleanup` create and remove git worktrees under `.specs/workspaces/` for parallel Execute waves
- **Execution policy** — configure `budget`, `scope`, and `escalation` in `.specs/config.yaml`; CLI: `execution-policy status`, `check-path`, `record-retry`
- **Docs:** [Restart PRD seed](guide/Restart-prd-seed.md) for clean-project reboot

## 3.1.11 — Atlas companion doctor (Lego stack)

- **Companion doctor:** reads `.specs/companions/INDEX.json` (written by Atlas `install`); probes gate mirror, rule, registry section, and preserve paths per companion
- **`spec-guardrails doctor`:** lists installed Atlases when paired — no hardcoded Atlas list in Guardrails code
- **Docs:** Companion: Atlas family (guide removed in 3.2.0); ecosystem guide links Atlas schema contract
- **CLI:** fix `doctor` help text (`USAGE` template backticks broke the CLI)

## 3.1.10 — Path safety leftovers + Actions publish

- Confine `validate-quick` to `.specs/quick/NNN-slug` (reject `..` and outside paths)
- `project-init --domains` uses `assertSafeDomainSlug`
- Doctor Process score treats `config.yaml` as optional (aligns with hub)
- Regression: Process score stays ready without Cursor baseline / config
- Hub Complexity Router lists both Quick gates (`check_commit` + `validate-quick`)
- Actions publish: no auto bump — publishes version already on `main` after merge; refuse duplicate npm versions; tag `vX.Y.Z`

## 3.1.9 — Audit hardening

- Quick gate contract unified in hub (`check_commit.py` + `validate-quick`)
- Path safety for feature IDs and domain slugs (Node + Python)
- Doctor Process score no longer penalizes missing Cursor baseline rule
- Windows Python resolution prefers `py -3`; stricter version parse
- Docs parity for four adapters; README guarantees matrix rows; CONTRIBUTING link fix
- Publish workflow requires CHANGELOG section matching `package.json` version

## 3.1.8 — Automated release bump

- Version bump published via GitHub Actions (`chore release`); no additional product delta beyond 3.1.7 line

## 3.1.7 — Platform adapters + doctor modes + parity hardening

- **Adapters shipped:** GitHub Copilot (`.github/copilot-instructions.md` + `.github/skills/`), OpenAI Codex (`.codex/AGENTS.md` + `.codex/skills/`), root `AGENTS.md` open standard
- **Doctor:** separate **Process** and **Brakes** scores; requires hub in all adapter trees and all platform entry contracts; JSON `modes` object; Python 3.10+ enforcement
- **Contracts:** Cursor and Claude use the same `buildExecutionContractBlock` as Copilot/Codex (includes `classify-change` / `feature-status`)
- **Docs:** FAQ, README, Quick-start, hub aligned with shipped adapters; Process mode naming; GitHub doc links from install next-steps

## 3.1.6 — npm sync

- Published on npm (description aligned with Process vs Brakes positioning)

## 3.1.5 — npm description (tagline-first)

- **npm `description`:** lead with honest-agents tagline; Process vs Brakes; Guarantees matrix; any AI agent (no repo-local framing)

## 3.1.4 — npm description positioning

- Prior publish line; superseded by 3.1.5 tagline-first `description`

## 3.1.3 — Release patch

- Version bump for docs positioning publish line

## 3.1.1 — Release patch

- npm publish of the 3.1 hardening line (same feature set as 3.1.0)

## 3.1.0 — Hardening (doctor + traceability + CLI helpers)

- **Doctor:** parse canonical STATE `- Feature:` (Execute hints work again); visible **PYTHON MISSING** banner; smoke test uses `resolvePython()`
- **`validate-traceability`:** structural gate — REQ → tasks → same-line validation coverage evidence
- **`validate-quick`:** structural gate for `.specs/quick/` TASK.md / SUMMARY.md
- **CLI:** `classify-change` (heuristic tier), `feature-status` (artifacts + next step)
- **Install:** writes `.claude/CLAUDE.md` alongside `.cursorrules` — [Platform parity](guide/Platform-parity.md)
- **Archive close:** re-runs `validate-traceability` before `validate-state`
- **Token fixtures:** three pinned profiles (`naive` / `specify` / `execute`) under `test/fixtures/token-cost/`
- **Docs:** honest [Gates and guarantees](guide/Gates-and-guarantees.md); Quick tier on [Home](guide/Home.md); FAQ → Discussions Q&A

## 3.0.0 — Spec Guardrails (final name)

**Breaking rename + clean break.** No production consumers expected; dual-path removed.

| Item | Was (2.x) | Now (3.0) |
| --- | --- | --- |
| Package | `@luizsantiago/spec-seatbelt` | `@luizsantiago/spec-guardrails` |
| CLI | `spec-seatbelt` | `spec-guardrails` |
| Scripts | `.specs/seatbelt/scripts/` (+ harness dual-path) | `.specs/guardrails/scripts/` **only** |
| Markers | `SPEC-SEATBELT`, `seatbelt-managed` | `SPEC-GUARDRAILS`, `guardrails-managed` |
| Env | `SPEC_SEATBELT_REPO_URL` / `HARNESS_REPO_URL` | `SPEC_GUARDRAILS_REPO_URL` |
| APIs | `*Seatbelt*` | `*Guardrails*` |
| Doctor | Seatbelt Ready | Guardrails Ready |

- Docs: [Migration](guide/Migration.md), [Stability policy](guide/Stability-policy.md)
- Companion guide updated for `@luizsantiago/spec-guardrails`
- `install` still **upgrades** old `.cursorrules` / managed-rule markers (seatbelt + harness) to the new ones; it does **not** keep reading old script directories at runtime

## 2.2.x — Internal seatbelt branding

- Gate scripts path: `.specs/seatbelt/scripts/` (legacy `.specs/harness/scripts/` still resolved on 2.x)
- Markers: `SPEC-SEATBELT` in `.cursorrules`; `seatbelt-managed` in project rules
- Config API renamed: `parseSeatbeltConfig`, `mergeSeatbeltConfigs`, …
- `doctor`: **Seatbelt Ready** score + Execute hint (`loop-plan` / `validate-state`)
- Docs: agent commands, skills/hub, gates reference moved out of README
- Companion guide: Full Stack Floor Map (`@luizsantiago/fullstack-floor-map`; doc removed in 3.1.x docs refresh)
- Desks v3 pairing notes (planned Floor Map 0.5.0) — Lane vs Desk vs seatbelt ownership

## 2.1.x — Parallel Execute

- `loop-plan` CLI and `loop_plan.py` gate — next wave + parallel groups
- `/loop` orchestration with sub-agents when files are disjoint
- `task-graph-engineering.md` and `sub-agents.md` integration

## 2.0.x — Package rename

- npm: `@luizsantiago/spec-seatbelt` (was `@luizsantiago/agentic-harness`)
- CLI: `spec-seatbelt`
- Same install layout; breaking only the package name

## 1.3.x — Last `agentic-harness` release

- Final publish under old package name — migrate to `spec-seatbelt` for 2.x (then guardrails for 3.x)

## 1.1.x — Brownfield

- `project-init` — scan existing repos into `.specs/` project memory
- Domain stubs, `PROJECT.md`, stack detection

## 1.0.x — Config presets

- `init-config`, built-in presets (`default`, `node-ts`, `python`)
- `.specs/config.yaml` with phase rules and `extends`

## 0.9.x — Archive

- `archive-feature` — merge verified work into domain specs and `ROADMAP.md`
- Delta spec merge into long-lived domain truth

## 0.8.x — Feature lifecycle

- `feature-init` — numbered feature folders, `STATE.md`, local branches (Tier 0)
- Git blast-radius tiers in hub contract

## 0.7.x — Gate freeze line

- Structural Python gates frozen for stability (see ADR 0001)
- Hub + eight sister skills always install together
- Conditional sisters: one at a time

## Earlier 0.5.x–0.6.x — Power-ups

- Stronger task/spec cross-checks, adversarial gate test suite
- Lessons engine, discrimination sensor on verify
- See `prd/harness-power-ups.md` for product intent

---

### Migration notes

| From | Action |
| --- | --- |
| `agentic-harness` 1.x | `npx @luizsantiago/spec-guardrails install` (fresh) |
| `spec-seatbelt` 2.x | Same; then drop `.specs/seatbelt/` / `.specs/harness/` after verify |
| **3.0** | No dual-path; see [Migration](guide/Migration.md) |

[GitHub Releases](https://github.com/luizssantiago92/spec-guardrails/releases)
