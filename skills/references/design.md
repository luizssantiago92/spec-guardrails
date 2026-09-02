# Design

Define HOW to build it: architecture, components, reuse, and risk. Optional phase.

## When to Use

- New architecture, new API surface, or infrastructure change
- Unfamiliar technology or a pattern the codebase does not have yet
- More than one defensible approach with real trade-offs

## When NOT to Use

- Straightforward changes with no architectural decision — design inline during Execute
- Bug fixes, copy changes, config tweaks

Skipping Design is the default for Simple and Medium tiers.

## Inputs

- Approved `spec.md`
- `context.md` when Discuss ran
- `.specs/STATE.md` decisions (`AD-NNN`)
- Confirmed lessons: `python3 .specs/guardrails/scripts/lessons.py list --status confirmed`
- Existing codebase structure and conventions
- `context-limits.md` — this feature only

## Output

`.specs/features/[feature]/design.md`

## Procedure

1. **Map what already exists.** List the components you will reuse before proposing new ones. Reuse beats invention.
2. **Load confirmed lessons** that constrain this design (`lessons.py list --status confirmed`).
3. **Follow the Knowledge Verification Chain** for anything unfamiliar: codebase → project docs → MCP/Context → web search → flag uncertainty. Never fabricate an API.
4. **Choose an approach and state it definitively.** Record the alternatives you rejected and why — that is the part future readers need.
5. **Draw the shape.** A small component table and a step-by-step data-flow table beat three vague paragraphs.
6. **Name the risks** and the mitigation for each. A risk without a mitigation is a blocker.
7. **Link every component back to requirement IDs.** Anything that serves no `REQ` is scope creep.
8. **Promote project-wide decisions** to `STATE.md` as `AD-NNN` (see `memory.md`).

## Template

```markdown
# Design: [Feature]

## Context
[Why this design is needed — constraints, scale, and links to REQ IDs.]

## Decision
[The chosen approach in two or three sentences.]

## Alternatives considered
| Option | Pros | Cons | Why not |
| --- | --- | --- | --- |
| A | … | … | … |
| B (chosen) | … | … | selected |

## Risks
| Risk | Mitigation |
| --- | --- |
| … | … |

## Approach
[Optional summary — may mirror Decision.]

## Components

| Component | Responsibility | New or reuse | Serves |
| --- | --- | --- | --- |
| [name] | [what it does] | reuse `src/...` | REQ-001 |

## Data Flow

| Step | From | To | Payload / notes |
| ---: | --- | --- | --- |
| 1 | Client | API | [request] |
| 2 | API | Service | [validated input] |
| 3 | Service | Store | [persistence] |

## Decisions

### AD-00X: [Decision]
- **Chosen**: [option]
- **Rejected**: [option] because [reason]

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| [risk] | [impact] | [mitigation] |

## Out of Scope for This Design
- [explicitly excluded]

## Ship Surface

Fill when tasks touch infra paths (Docker, Compose, Terraform, Helm, CI workflows). Required fields for the gate: **Deploy unit**, **CI**, **Rollback**.

| Field | Value |
| --- | --- |
| API / contract | OpenAPI path, health route, or N/A (worker/CLI) |
| Migrations | Command or N/A |
| Env / secrets | Source of config — no secret values |
| Deploy unit | Service/chart/worker unit that ships |
| CI | Workflow or command before merge |
| Rollback | How to undo a bad deploy |
| Observability | Logs/metrics/alerts for this change |

## AI Surface

Fill when tasks touch AI paths (`prompts/`, `evals/`, MCP, embeddings, LLM/RAG code). Required fields for the gate: **Eval harness**, **Fallback / degrade**.

| Field | Value |
| --- | --- |
| Capability | chat, RAG, tool-use, embed batch, etc. |
| Model / provider | Model name — no API keys |
| Tools / MCP scope | Allowlist / deny list |
| Eval harness | `pytest tests/eval/` or dataset path |
| PII / data policy | What must not reach the model |
| Fallback / degrade | Behavior on timeout/failure/rate limit |
| Cost guard | Budget link or execution-policy note |
```

## Rules

- No implementation code in `design.md` — interfaces and signatures only when they clarify a contract.
- If tasks touch infra or AI `Files`, run `validate_ship_surface.py` after Tasks and before Verify.
- If the design reveals that the spec is wrong or incomplete, stop and update `spec.md` first; re-run the spec gate.
- When multiple defensible implementations exist for the same spec, use explicit **solution exploration** (`references/solution-exploration.md`) before Execute — not parallel ad-hoc spikes.
- Prefer the smallest design that satisfies the spec. Extensibility that no requirement asks for is speculation.

## Next

`tasks.md` — break the design into atomic tasks.
