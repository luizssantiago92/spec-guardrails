# Appendix A — FastAPI

Same SDD flow as [Tutorial 04](04-python-platform-ship-surface.md). Only the **Ship Surface — API/contract** block changes.

## Ship Surface (FastAPI)

| Field | Value |
| --- | --- |
| API / contract | OpenAPI at `/openapi.json`; `GET /health` returns 200 |
| Deploy unit | uvicorn in compose service `api` |
| CI | pytest + `docker compose config` |
| Rollback | redeploy previous image tag |

## Hints

- Gate task `Files` may include `src/api/main.py`, `docker-compose.yml`.
- Add `pytest` + HTTPX tests against `/health` before claiming done.

## Limitations

- No auto-generated OpenAPI gate — verifier checks tests, not Swagger UI.
