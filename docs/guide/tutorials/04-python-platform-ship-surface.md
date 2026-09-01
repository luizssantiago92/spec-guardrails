# Tutorial 04 — Python platform (Ship + AI Surface)

**Time:** ~45 minutes (main path, no web framework)  
**Prerequisite:** [02 — Medium feature](02-medium-feature.md) or equivalent SDD familiarity

You will ship a small Python module with **Compose + CI + Terraform stub**, document **Ship Surface**, and run the new gate — framework-agnostic.

## Scenario

Add a `greeting` module, containerize it, validate infra in CI, and document how you would roll back. No FastAPI required on this path.

## 1. Preset and project context

```bash
npx @luizsantiago/spec-guardrails init-config --preset python-platform
# or brownfield:
npx @luizsantiago/spec-guardrails project-init
```

Confirm `.specs/config.yaml` contains `extends: python-platform` (or was created with that preset).

## 2. Feature and spec

```bash
npx @luizsantiago/spec-guardrails feature-init "greeting service with compose CI"
```

Write `spec.md` with at least one `### REQ-001` using `SHALL`/`MUST`, plus `## Assumptions`.

```bash
python3 .specs/guardrails/scripts/validate_spec.py <feature>
```

## 3. Design with Ship Surface

Create `design.md` using the template in `references/design.md`. Minimum for this tutorial:

```markdown
## Ship Surface

| Field | Value |
| --- | --- |
| API / contract | N/A — library invoked by CLI |
| Deploy unit | docker compose service `app` |
| CI | .github/workflows/ci.yml runs pytest + compose config |
| Rollback | redeploy previous image tag `app:previous` |
| Observability | log line on startup |
```

## 4. Tasks touching infra

Example task:

```markdown
### T2: Add compose file
- **Requirement**: REQ-001
- **Files**: docker-compose.yml
- **Depends on**: T1
- **Tests**: tests/test_compose.py
- **Gate**: docker compose config --quiet
- **Done when**: service builds and config validates
```

Run:

```bash
python3 .specs/guardrails/scripts/validate_tasks.py <feature>
python3 .specs/guardrails/scripts/validate_ship_surface.py <feature>
```

Gate **FAIL** without Ship Surface → fix `design.md` → re-run until PASS.

## 5. Execute and verify

Implement tasks in order. Before each commit: `pytest`, `check_commit.py`, `check_suppressions.py`.

Close with `/verify` (fresh context): `validate_traceability`, `quality-checks` (uncomment checks in config as you add infra), `validate_ship_surface`, `validate_state`.

```bash
npx @luizsantiago/spec-guardrails feature-overview <feature> --write
```

Check **Operational traceability** in `overview.md`.

## Appendices (same SDD flow, different contract block)

| Appendix | Stack | Focus |
| --- | --- | --- |
| [A — FastAPI](appendix-a-fastapi.md) | REST + OpenAPI | Health route / OpenAPI in Ship Surface |
| [B — Django](appendix-b-django.md) | DRF + migrations | `migrate` + endpoint in Ship Surface |
| [C — Worker](appendix-c-worker.md) | Celery/RQ | Deploy unit = worker + broker, no HTTP |
| [D — RAG / MCP / eval](appendix-d-ai-rag-mcp.md) | AI feature | AI Surface + offline eval |

## Limitations

- This tutorial does not deploy to a real cloud — Terraform/Helm are structural checks only.
- `validate_ship_surface` does not run `terraform apply` or live LLM calls.
- Production observability (APM, LangSmith) is out of scope — document intent in Ship/AI Surface only.
