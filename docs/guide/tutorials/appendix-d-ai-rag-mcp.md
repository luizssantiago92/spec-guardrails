# Appendix D — RAG / MCP / eval

Extends [Tutorial 04](04-python-platform-ship-surface.md) with **AI Surface** for a retrieval feature.

## AI Surface (minimum for gate)

| Field | Value |
| --- | --- |
| Capability | RAG Q&A over internal docs |
| Model / provider | e.g. gpt-4o — keys from env only |
| Tools / MCP scope | read-only doc search; deny shell/write tools |
| Eval harness | `pytest tests/eval/ -m "not live"` |
| PII / data policy | strip emails before embed; see `security-review` |
| Fallback / degrade | return 503 + cached FAQ when model times out |
| Cost guard | `execution-policy` budget in `.specs/config.yaml` |

## Suggested flow

1. `/elicit` when the owner says "add RAG" without sources or eval criteria.
2. `solution-explore` if choosing RAG vs keyword search.
3. Task `Files`: `prompts/`, `tests/eval/test_rag.py`, optional `src/rag/`.
4. Run `validate_ship_surface` — requires **Eval harness** + **Fallback / degrade**.

## Limitations

- Offline eval only in gate defaults — live model calls belong in optional marked tests.
- No LangSmith/Coze Loop integration — cite eval output in `validation.md` manually.
