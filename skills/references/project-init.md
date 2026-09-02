# Project Init (Brownfield)

Map an existing codebase into `.specs/` project memory before the first `/specify`.

## When to Use

- Adopting Spec Guardrails on a repo that already has code
- Owner wants domain specs and `PROJECT.md` before feature work
- Before `/constitution` or the first Medium+ feature on a brownfield repo

## When NOT to Use

- Greenfield repo with no code yet — use `install` + `feature-init`
- Quick-tier-only work with no domain map — optional

## Inputs

- Repository layout (`packages/`, `apps/`, `src/domains/`, etc.)
- Stack markers (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`)
- Optional `.specs/config.yaml` preset choice

## Output

- `.specs/project/PROJECT.md` — vision, detected stack, domain map
- `.specs/project/ROADMAP.md` — planned domain drafting items
- `.specs/domains/[domain]/spec.md` — brownfield stubs (one per detected/manual domain)
- `.specs/config.yaml` — from auto-detected or chosen preset (when missing)
- `.specs/memory/code-index.json` — shallow symbol map (unless `--no-code-index`)

## Procedure

1. **Run the scan (Tier 0):**
   ```bash
   npx @luizsantiago/spec-guardrails project-init --dry-run
   npx @luizsantiago/spec-guardrails project-init [--preset node-ts] [--domains auth,billing]
   ```
2. **Review with the owner** — edit `PROJECT.md`, trim false-positive domains, fill Vision/Constraints.
3. **Draft domain truth** — replace stub requirements in `.specs/domains/*/spec.md` from code review (or leave stubs until features archive in).
4. **Optional constitution** — `references/constitution.md` when principles are not yet written.
5. **First feature** — `feature-init` then `specify.md` using **delta specs** when domain truth exists.

## Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Print stack/domains only |
| `--preset <name>` | Force config preset (`default`, `node-ts`, `python`) |
| `--domains a,b` | Manual domain list (overrides auto-detect) |
| `--no-domains` | Skip domain folder scaffolding |
| `--no-project` | Skip `PROJECT.md` |
| `--no-code-index` | Skip `code-index rebuild` after init |
| `--force` | Overwrite generated project/domain/config files |

## Rules

- Scan results are **hints**, not approved requirements.
- Never treat stub domain specs as enforced gates — populate or merge via `archive-feature`.
- Commit `.specs/project/` and `.specs/domains/` locally (Tier 0); push needs owner go-ahead.

## Next

- Principles missing → `constitution.md`
- First change → `feature-init` then `specify.md` (delta spec when brownfield)
- Back → `agent-architecture.md`
