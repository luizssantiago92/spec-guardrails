# Appendix C — Worker (Celery / RQ)

Same SDD flow as [Tutorial 04](04-python-platform-ship-surface.md). No HTTP API — Ship Surface uses N/A for API/contract.

## Ship Surface (worker)

| Field | Value |
| --- | --- |
| API / contract | N/A — async worker consumes queue |
| Deploy unit | worker service + Redis/Rabbit broker in compose |
| CI | pytest + compose config |
| Rollback | drain queue, redeploy worker image |
| Observability | task failure metric / dead-letter queue |

## Limitations

- Queue depth and broker HA are operational concerns — document, do not gate.
