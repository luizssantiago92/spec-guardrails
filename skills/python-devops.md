# Python DevOps

Sister skill for **Ship Surface** — deploy, CI, IaC, and rollback evidence in `design.md`. Load on demand when tasks touch Docker, Compose, Terraform, Helm, CI workflows, or when the project uses the `python-platform` preset.

**Not a substitute for** `ship-ready.md` (owner go-live checklist) or `security-review.md` (secrets/PII).

## Limitations

- Structural gate only — `validate_ship_surface.py` checks that fields exist, not that `terraform plan` is safe or rollback was tested in production.
- No Kubernetes runtime management — Helm template validation is optional via `quality.checks`, not built-in.
- Framework-agnostic — FastAPI/Django/worker patterns live in tutorial appendices, not in this skill.

## When to Use

- Tasks list `Files` under `Dockerfile`, `docker-compose*.yml`, `terraform/`, `charts/`, `.github/workflows/`
- Owner asks about deploy, rollback, migrations before ship
- `project-init` suggested preset `python-platform`

## When NOT to Use

- Pure library/CLI changes with no infra touch — skip Ship Surface
- Live observability or incident response — use your APM stack, not Spec Guardrails

## Ship Surface (design.md)

Document before Execute when infra paths appear in tasks:

| Field | Purpose |
| --- | --- |
| **API / contract** | OpenAPI path, health route, or N/A for workers/CLIs |
| **Migrations** | Alembic, Django migrate, or N/A |
| **Env / secrets** | Which vars come from where — never values in git |
| **Deploy unit** | Container service, Helm release, worker + broker |
| **CI** | Workflow or command that must pass before merge |
| **Rollback** | How to undo a bad deploy |
| **Observability** | Logs, metrics, alerts minimum for this change |

Gate requires **Deploy unit**, **CI**, and **Rollback** non-empty when infra globs match task `Files`.

## Procedure

1. **Reuse existing infra** — extend compose/terraform/chart before inventing parallel paths.
2. **Migration before deploy** — document order in tasks; gate does not run migrations.
3. **Quality checks** — uncomment matching lines in `quality.checks` (`docker compose config`, `terraform validate`, `helm template`).
4. **Before Verify** — run `validate_ship_surface.py`; fix `design.md` on FAIL.
5. **Owner tiers** — local commits are Tier 0; push/deploy need explicit go-ahead (`git-handoff.md`).

## Anti-patterns

- Tasks touch `docker-compose.yml` but `design.md` has no Ship Surface
- Rollback = "revert commit" with no deploy-specific steps
- Secrets in spec or design artifacts
- Skipping CI gate in tasks when compose/terraform changed

## Related

- `docs/guide/python-platform.md` — full platform map
- `ai-engineering.md` — when the same feature also touches LLM/RAG/MCP paths
- `references/design.md` — Ship Surface template
- `ship-ready.md` — after Verify PASS, when owner asks to go live
