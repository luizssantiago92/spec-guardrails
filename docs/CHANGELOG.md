# Changelog

Version history for `@luizsantiago/spec-guardrails`. Upgrade steps: [Migration](guide/Migration.md). Name freeze: [Stability policy](guide/Stability-policy.md).

## Unreleased

—

## 3.1.7 — Platform adapters + doctor modes

- **Adapters shipped:** GitHub Copilot (`.github/copilot-instructions.md` + `.github/skills/`), OpenAI Codex (`.codex/AGENTS.md` + `.codex/skills/`), root `AGENTS.md` open standard
- **Doctor:** separate **Process** and **Brakes** scores; JSON `modes` object; clearer Python banner
- **Docs:** Home/FAQ without “repo-local” framing; Architecture and Platform-parity updated

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
