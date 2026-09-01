# Appendix B — Django / DRF

Same SDD flow as [Tutorial 04](04-python-platform-ship-surface.md). Emphasize migrations and DRF endpoints in Ship Surface.

## Ship Surface (Django)

| Field | Value |
| --- | --- |
| API / contract | DRF route `/api/v1/...` documented in spec |
| Migrations | `python manage.py migrate` before deploy |
| Deploy unit | gunicorn + postgres service in compose |
| CI | pytest + migrate check in workflow |
| Rollback | migrate reverse plan + previous image |

## Limitations

- Gate does not run migrations — only documents order in design/tasks.
