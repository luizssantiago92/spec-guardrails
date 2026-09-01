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
| Skills under detected platform (default Cursor) + any existing skill trees | `.specs/STATE.md`, feature specs, decisions |
| All four trees when using `--all-platforms` | User prose outside managed blocks |
| Gate scripts under **`.specs/guardrails/scripts/`** | Prior platform trees when migrating IDEs |
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

## Upgrading to 4.3 (Cursor hooks removed)

**4.3.0** removed Cursor IDE hooks entirely. The automatic scope and shell checks that hooks used to trigger are still available — the agent runs `context-guard` and `sandbox` CLI commands at phase boundaries instead.

| Situation | Action |
| --- | --- |
| Upgrading from 4.2.x or earlier with hook artifacts | Run `npx @luizsantiago/spec-guardrails install` — legacy `.cursor/hooks.json` entries, shipped hook scripts, and the `cursor.hooks` config block are cleaned automatically |
| Scripts still using `--with-cursor-hooks` / `--without-cursor-hooks` | Flags are accepted as no-op with a deprecation warning; remove them when convenient |
| Scope or shell safety | Use `context-guard check-edit`, `context-guard check-complete`, and `sandbox check-command` via CLI |

See [CHANGELOG](../CHANGELOG.md#430--cursor-hooks-removed).

## Upgrading to 4.4 (platform-aware install)

**4.4.0** installs skills into **one platform tree by default** (auto-detected; Cursor when unknown). Prior trees are kept when you change IDEs.

| Situation | Action |
| --- | --- |
| Fresh install in Cursor only | `install` — writes `.cursor/skills/` only |
| Repo used by multiple agents | `install --all-platforms` |
| Force a specific agent | `install --platform claude` (or `cursor`, `copilot`, `codex`) |
| Migrated from Claude to Cursor | `install` refreshes both `.claude/skills/` (existing hub) and `.cursor/skills/` (detected) |

See [CHANGELOG](../CHANGELOG.md#440--platform-aware-install--hygiene).

## Upgrading to 4.2+ (Cursor hooks opt-in) — historical

**4.2.0** changed Cursor hooks from **installed by default** to **opt-in**. Hooks were **removed in 4.3.0** — see above.

| Situation | Action (historical) |
| --- | --- |
| Fresh install on 4.2.x | Hooks were not registered unless you ran `install --with-cursor-hooks` or set `cursor.hooks: true` |
| Upgraded from 4.1.x with hooks present | Existing entries were kept until `install --without-cursor-hooks` |

See [CHANGELOG](../CHANGELOG.md#430--cursor-hooks-removed).

## 4.x era summary (Guardrails)

After **3.0**, the package name stays **Spec Guardrails**. Major themes by minor:

| Versions | Theme | Migration detail |
| --- | --- | --- |
| **4.0–4.1** | `/elicit`, requirements briefs, `validate-req-analysis` | Re-run `install`; optional elicitation only |
| **4.2–4.3** | Cursor hooks opt-in → removed | [4.3 hooks removed](#upgrading-to-43-cursor-hooks-removed) |
| **4.4** | Platform-aware `install` | [4.4 platform install](#upgrading-to-44-platform-aware-install) |
| **4.5** | `check-suppressions`, `quality-checks`, config fixes | Update `config.yaml.example` patterns if you copied old template |
| **4.6** | Tutorials, `feature-overview` | Additive — no breaking CLI |
| **4.7** | `python-platform` preset, Ship/AI Surface gate | [python-platform.md](python-platform.md); optional preset |

**Version picking:** see [Product history](Product-history.md) for which pin fits your team.

## Upgrading to 4.7 (Python platform pack)

**4.7.0** adds the optional `python-platform` preset and `validate-ship-surface` gate. Existing repos without that preset are unaffected until you opt in.

| Situation | Action |
| --- | --- |
| Python + DevOps + AI team | `init-config --preset python-platform` or `extends: python-platform` in `.specs/config.yaml`; read [python-platform.md](python-platform.md) |
| Everyone else | Stay on `python`, `node-ts`, or `default` — no action required |
| Pin older line without platform pack | `npx @luizsantiago/spec-guardrails@4.6.0 install` — see [Product history](Product-history.md) |

See [CHANGELOG](../CHANGELOG.md#470--python-platform-pack-backend--devops--ai).

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

## Related

- [Stability policy](Stability-policy.md) — why the name will not change again
- [Product history](Product-history.md) — eras and version pinning
- [Restart-prd-seed.md](Restart-prd-seed.md) — clean single-package restart PRD template
- [CHANGELOG](../CHANGELOG.md) — 3.0.0 section
