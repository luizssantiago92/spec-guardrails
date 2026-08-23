# Companion: Tech Atlas

**Tech Atlas** (`@luizsantiago/tech-atlas`) is the first **Atlas** companion — optional specialization for **tech engineering** context (Path Domains + specialist catalog). Spec Guardrails works **without** any Atlas. Tech Atlas works **solo** or **paired** (Lego) with Guardrails ≥3.

Mirror (Atlas): [Companion-spec-guardrails.md](https://github.com/luizssantiago92/tech-atlas/blob/main/docs/guide/Companion-spec-guardrails.md)

## Atlas family

**Atlas** packages specialize AI agents by domain (tech, marketing, content, …). Each Atlas:

- **Solo** — install and use without Guardrails
- **Lego / paired** — install Guardrails first, then the Atlas; keep both updated for harmony

Only **Tech Atlas** ships today. Future Atlases follow the same Lego contract under their own npm names and `.specs/<atlas>/` roots.

## Identity

| Field | Value |
| --- | --- |
| Display name | **Tech Atlas** |
| npm | `@luizsantiago/tech-atlas` **0.5.0** |
| CLI | `tech-atlas` (transition aliases `fullstack-floor-map`, `agentic-fullstack`) |
| Repo | [luizssantiago92/tech-atlas](https://github.com/luizssantiago92/tech-atlas) |

## Solo vs paired

| Mode | Requirement | Behavior |
| --- | --- | --- |
| **Solo** | None | Atlas `install` / `doctor` / `route` / `validate-domains`; gate under `.specs/atlas/scripts/` |
| **Paired** | Guardrails ≥3 (`.specs/guardrails/scripts/_common.py`) | Same gate mirrored to `.specs/guardrails/scripts/`; Execute = Guardrails + one Path Domain + ≤1 specialist; **Verify = Guardrails only** |

## Install order (product repo)

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/tech-atlas install
npx @luizsantiago/tech-atlas doctor
```

Solo: skip the Guardrails line.

## Path Domains

Six code rooms (not Floors/Lanes): `web`, `mobile`, `backend`, `data`, `ml`, `infra`.

One Path Domain manual (`*-engineering.md`) per task `Files` list. Mixed rooms (e.g. `apps/web` + `apps/api` in one task) fail `validate-domains`.

## Scripts and paths

| Asset | Owner | Path |
| --- | --- | --- |
| Routing gate | Tech Atlas | `.specs/atlas/scripts/validate_layer_routing.py` (always) |
| Gate mirror (paired) | Tech Atlas → Guardrails scripts dir | `.specs/guardrails/scripts/validate_layer_routing.py` |
| Path Domain skills + catalog | Tech Atlas | `.cursor/skills/` (and `.claude/skills/`, …) |
| Desks (planned) | Tech Atlas | `.specs/desks/` — **not shipped** in 0.5.0 |

## Ownership (harmony)

| Piece | Owner |
| --- | --- |
| Spec, tasks, process gates, loop-plan, `/verify` | **Spec Guardrails** |
| Path Domains, routing gate, specialist catalog | **Tech Atlas** |
| Desks + INDEX + handoff (when shipped) | **Tech Atlas** |

Authority on Execute: Guardrails (spec / Gate / evidence) → Path Domain manual → specialist craft. Specialists never override `Gate` or `PROJECT.md` test commands.

## Harmony loop

1. **Specify / Tasks (Guardrails)** — one Path Domain per task `Files`
2. **Routing gate:** `npx @luizsantiago/tech-atlas validate-domains <feature>`
3. **Execute** — Guardrails implement set + one Path Domain manual + ≤1 catalog `SKILL.md` (≤2 craft refs)
4. **`/verify`** — Guardrails Verify sisters only (no Path Domain manuals, no catalog)

## Coexistence on re-install

Guardrails `install` refreshes Guardrails-owned skills and `.specs/guardrails/scripts/` gates. It must **not** delete Atlas-owned assets:

- Path Domain skills and specialist catalog folders
- `.specs/atlas/` (including the routing gate)
- Mirrored `validate_layer_routing.py` under `.specs/guardrails/scripts/` when paired
- `.specs/desks/` if present

Atlas `install` must not wipe Guardrails hub, gates, or `.specs/features/`.

## What Guardrails does not do

- Absorb `route`, `validate-domains`, or Path Domain routing into this CLI
- Load Path Domain manuals or catalog specialists on `/verify`
- Require Tech Atlas (or any Atlas) to function

## Related

- [ecosystem.md](ecosystem.md) — where Atlases sit in the stack
- [Tech Atlas Migration](https://github.com/luizssantiago92/tech-atlas/blob/main/docs/guide/Migration.md) — 0.4 → 0.5 rename
