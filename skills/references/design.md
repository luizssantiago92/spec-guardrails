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

## Approach
[The chosen approach in two or three sentences.]

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
```

## Rules

- No implementation code in `design.md` — interfaces and signatures only when they clarify a contract.
- If the design reveals that the spec is wrong or incomplete, stop and update `spec.md` first; re-run the spec gate.
- When multiple defensible implementations exist for the same spec, use explicit **solution exploration** (`references/solution-exploration.md`) before Execute — not parallel ad-hoc spikes.
- Prefer the smallest design that satisfies the spec. Extensibility that no requirement asks for is speculation.

## Next

`tasks.md` — break the design into atomic tasks.
