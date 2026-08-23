# Companion: Atlas family

**Atlas** packages are optional specialization companions for Spec Guardrails. Each Atlas ships a formal **`atlas.manifest.json`** and registers into the consumer project on `install`.

Only **Tech Atlas** (`@luizsantiago/tech-atlas`) ships today. Future Atlases (e.g. marketing-atlas) follow the same contract without Guardrails code changes.

Mirror (Tech Atlas): [Atlas-schema.md](https://github.com/luizssantiago92/tech-atlas/blob/main/docs/guide/Atlas-schema.md)

## Discovery

Guardrails reads **`.specs/companions/INDEX.json`** — written by each Atlas `install`. No hardcoded Atlas list in Guardrails code.

```json
{
  "schemaVersion": "1.0.0",
  "paired": true,
  "companions": [
    {
      "id": "tech-atlas",
      "npm": "@luizsantiago/tech-atlas",
      "version": "0.6.0",
      "displayName": "Tech Atlas",
      "scriptsDir": ".specs/tech-atlas/scripts",
      "gates": ["validate_layer_routing.py", "validate_tech_atlas_routing.py"],
      "projectSection": "## Tech Atlas — Path Domain registry",
      "preservePaths": [".specs/tech-atlas/scripts", ".cursor/rules", "..."]
    }
  ]
}
```

## Doctor

`npx @luizsantiago/spec-guardrails doctor` reports optional **Atlas companions** when `INDEX.json` exists, including per-Atlas gate health.

## Preserve on re-install

Guardrails `install` uses whitelist copy — companion assets survive when listed in INDEX `preservePaths`. Known fallbacks when INDEX is absent:

- `.specs/tech-atlas/`, `.specs/atlas/` (legacy), `.specs/desks/`, `.specs/companions/`

## Install order (paired)

```bash
npx @luizsantiago/spec-guardrails install
npx @luizsantiago/tech-atlas install
npx @luizsantiago/spec-guardrails doctor
npx @luizsantiago/tech-atlas doctor
```

## Multi-Atlas gates

Each Atlas mirrors its routing gate to Guardrails with a **namespaced filename** (e.g. `validate_tech_atlas_routing.py`) so multiple Atlases can coexist.

## Verify (unchanged)

**Verify = Guardrails only.** No Atlas manuals, catalog, or desks on `/verify` — enforced by each Atlas `loadPolicy.verify.forbidden` in the manifest.

## Related

- [Companion-tech-atlas.md](Companion-tech-atlas.md) — Tech Atlas pairing details
- [ecosystem.md](ecosystem.md)
