# Stability policy

## Final name (frozen)

**Spec Guardrails** (`@luizsantiago/spec-guardrails`, CLI `spec-guardrails`) is the **final** product name.

- No further rebranding majors.
- Majors exist only for **gate / install / CLI contract** changes — never for renaming the package again.
- Historical names (`agentic-harness`, `spec-seatbelt`) appear only in [Migration](Migration.md) and changelog lineage.

## SemVer

| Bump | When |
| --- | --- |
| **Major** | Breaking change to published CLI commands, install layout consumers rely on, gate exit semantics, or removed dual-path support |
| **Minor** | New commands, new optional gates/skills, backward-compatible docs/behavior |
| **Patch** | Fixes, clarifying docs, non-breaking hardening |

`prepublishOnly` runs `npm test` before every publish.

## Gate freeze

Structural Python gates under `.specs/guardrails/scripts/` follow the freeze line documented in [Gates and guarantees](Gates-and-guarantees.md) and ADR 0001:

- Gates validate **markdown structure and evidence hooks**, not “the code implements the criterion.”
- Do not loosen adversarial gate tests to greenwash releases.
- New gate scripts are additive minors (or majors if they change required phase contracts).

## What stays stable across minors

- Zero runtime npm dependencies for the CLI
- Progressive skill loading (one phase guide per turn)
- Persistent project memory under `.specs/`
- English for code, tests, commits, and `.specs/` artifacts

## Related

- [Product history](Product-history.md) — eras, stable version picks, how to pin npm
- [Migration](Migration.md) — 3.0 clean break and 4.x upgrade notes
- [CHANGELOG](../CHANGELOG.md)
- [Gates and guarantees](Gates-and-guarantees.md)
