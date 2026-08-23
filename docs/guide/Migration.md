# Migration to Spec Guardrails 3.0

**Final product name:** Spec Guardrails (`@luizsantiago/spec-guardrails`). This name is frozen — see [Stability policy](Stability-policy.md).

## Lineage

| Era | Package / brand | Notes |
| --- | --- | --- |
| 1.x | `@luizsantiago/agentic-harness` | Original npm name; CLI `agentic-harness` |
| 2.0–2.1 | `@luizsantiago/spec-seatbelt` | Package/CLI rename; scripts still under `.specs/harness/` |
| 2.2 | `@luizsantiago/spec-seatbelt` | Internal seatbelt path (`.specs/seatbelt/`) + dual-path read of harness |
| **3.0** | **`@luizsantiago/spec-guardrails`** | **Final name.** Clean break — no runtime dual-path |

There is **no auto-migrator** for on-disk layout. Fresh `install` writes the 3.0 layout. Re-run `install` once after switching packages.

## Fresh install (recommended)

In each product repo:

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/spec-guardrails doctor
```

What `install` does on 3.0:

| Writes / refreshes | Preserves |
| --- | --- |
| Skills under `.cursor/skills/` and `.claude/skills/` | `.specs/STATE.md`, feature specs, decisions |
| Gate scripts under **`.specs/guardrails/scripts/`** | User prose outside managed blocks |
| Markers `SPEC-GUARDRAILS` / `guardrails-managed` | — |
| Upgrades old `.cursorrules` blocks (`SPEC-SEATBELT`, `AGENTIC-HARNESS`) | — |

## Breaking changes (clean break)

| Item | 2.x | 3.0 |
| --- | --- | --- |
| npm package | `@luizsantiago/spec-seatbelt` | `@luizsantiago/spec-guardrails` |
| CLI bin | `spec-seatbelt` | `spec-guardrails` (no alias) |
| Scripts path | `.specs/seatbelt/scripts/` (or harness dual-path) | **`.specs/guardrails/scripts/` only** |
| Env override | `SPEC_SEATBELT_REPO_URL` / `HARNESS_REPO_URL` | **`SPEC_GUARDRAILS_REPO_URL` only** |
| Config / memory APIs | `parseSeatbeltConfig`, `initSeatbeltMemory`, … | `parseGuardrailsConfig`, `initGuardrailsMemory`, … |
| Doctor banner | Seatbelt Ready | Guardrails Ready |

Runtime **does not** read `.specs/harness/scripts/` or `.specs/seatbelt/scripts/`. Copy or reinstall gates under `.specs/guardrails/scripts/`.

## From `spec-seatbelt` 2.x

1. Update docs/scripts that call `npx @luizsantiago/spec-seatbelt` → `@luizsantiago/spec-guardrails`.
2. Run `npx @luizsantiago/spec-guardrails install` in the product repo.
3. Remove obsolete `.specs/seatbelt/` or `.specs/harness/` trees after confirming gates work (`doctor`, one `validate-spec`).
4. Optional: deprecate awareness — the old package may show an npm deprecate notice pointing here.

## From `agentic-harness` 1.x

Same as above: install Spec Guardrails 3.0 fresh. Do not expect harness path dual-read.

## What we intentionally do not ship

- Automatic folder rename from harness/seatbelt → guardrails
- Dual CLI bin aliases (`spec-seatbelt` / `agentic-harness`)
- Silent acceptance of old env var names at runtime

## Optional Atlas companions

After Guardrails 3.x is installed, you may add [**Tech Atlas**](https://github.com/luizssantiago92/tech-atlas) (`@luizsantiago/tech-atlas`) for Path Domain routing and a specialist catalog — solo or paired (Lego). Guardrails does not require an Atlas. Pairing contract: [Companion-tech-atlas.md](Companion-tech-atlas.md).

## Related

- [Stability policy](Stability-policy.md) — why the name will not change again
- [Companion-tech-atlas.md](Companion-tech-atlas.md) — optional Tech Atlas Lego pairing
- [CHANGELOG](../CHANGELOG.md) — 3.0.0 section
