# AI Engineering

Sister skill for **AI Surface** — model scope, tools/MCP, eval harness, fallback, and PII policy in `design.md`. Load when `classify-change` detects llm/rag/mcp/agent/prompt signals or tasks touch `prompts/`, `evals/`, MCP paths.

**Not a substitute for** LangSmith/Coze Loop (live traces), MLOps platforms, or `security-review.md`.

## Limitations

- No live LLM observability — governance is versioned in git + structural gates, not production traces.
- Eval quality is the team's responsibility — the gate requires a documented harness, not passing scores.
- Semantic memory (`memory.retrieval.semantic`) is optional and off by default in `python-platform` preset.
- Does not run paid API calls during gates — offline eval (`pytest -m "not live"`) is the default pattern.

## When to Use

- Vague kickoff ("add RAG", "agent with tools") — pair with `/elicit` first
- Tasks list `Files` under `prompts/`, `evals/`, `tests/eval/`, `mcp/`, embeddings, or `*rag*`
- Spec criteria describe non-deterministic model behavior

## When NOT to Use

- Deterministic CRUD with no model — skip AI Surface
- Security-only review — use `security-review.md` / `appsec.md`

## AI Surface (design.md)

| Field | Purpose |
| --- | --- |
| **Capability** | chat, RAG, tool-use, batch embed, etc. |
| **Model / provider** | e.g. gpt-4o, claude-sonnet, Ollama — no API keys in git |
| **Tools / MCP scope** | allowlist / deny list for agent tools |
| **Eval harness** | `pytest tests/eval/` or dataset path — **required by gate** |
| **PII / data policy** | what must not reach the model; redaction path |
| **Fallback / degrade** | timeout, rate limit, safe response — **required by gate** |
| **Cost guard** | link to `execution-policy` / budget in `.specs/config.yaml` |

Gate requires **Eval harness** and **Fallback / degrade** when AI globs match task `Files`.

## Workflow connections (already shipped — do not reinvent)

| Tool | Use when |
| --- | --- |
| `/elicit` + `req-analysis` | Brief is vague before `/specify` |
| `solution-explore` | Choosing RAG vs fine-tune vs rules |
| `memory-retrieve` | Finding past AI decisions in `.specs/` |
| Discrimination sensor (`validate.md`) | Adversarial checks on behavior tests |
| `execution-policy` + `sandbox` | Budget and dangerous commands |
| `lessons.py` | After verify FAIL on eval — feed next sprint |

## Specs for non-deterministic behavior

- Write **testable** criteria: golden set, score thresholds, property bounds — not "answers well".
- Version prompts in repo (`prompts/`) — anti-pattern: prompt only in code.
- Eval tasks get explicit `Gate` commands; add offline eval to `quality.checks` when stable.

## Anti-patterns

- Tool without allowlist / MCP scope documented
- Eval only manual in chat — no harness in repo
- No fallback when model times out or refuses
- PII in prompts without policy line in AI Surface

## Related

- `docs/guide/python-platform.md` — capabilities and honest limits
- `python-devops.md` — when the same feature also ships infra
- `references/design.md` — AI Surface template
- `security-review.md` — PII, secrets, SSRF at verify
