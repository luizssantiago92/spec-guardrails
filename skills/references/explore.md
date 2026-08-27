# Explore

Think through an idea before committing to a spec. No artifacts required.

## When to Use

- The goal is fuzzy ("make auth better", "add dark mode somehow")
- You need to compare options against the existing codebase
- The owner is not sure what to build yet
- Before `/specify` on any non-Quick change

## When NOT to Use

- The owner already gave a clear, testable goal — go to `/specify`
- Quick-tier fixes (≤3 files) — use `quick-mode.md`

## Inputs

- Owner's question or idea, in their own words
- Existing codebase (read relevant modules only)
- `.specs/project/CONSTITUTION.md` when it exists
- `.specs/project/PROJECT.md` when it exists
- `context-limits.md` — do not load sibling feature specs

## Output

None required. Optionally capture decisions in chat. When the idea crystallizes, transition to `/specify`.

## Procedure

1. **Read the code that matters.** Skim the area the idea touches; name files and patterns you found.
2. **Restate the problem** in one sentence and confirm it with the owner.
3. **Offer 2–3 options** with trade-offs (complexity, dependencies, risk). Recommend one.
4. **Surface unknowns** with `[NEEDS CLARIFICATION: specific question]` — do not guess.
5. **Estimate complexity** using the hub router (Quick / Simple / Medium / Complex).
6. **Transition** when the owner picks a direction:
   ```bash
   npx @luizsantiago/spec-guardrails feature-init "chat with presence"
   ```
   Then open `references/specify.md`.

## Rules

- No production code during Explore.
- No `spec.md` until `/specify` runs (after `feature-init`).
- No scaffolding empty `design.md` or `tasks.md`.
- Keep the working set small — hub + this file + targeted code reads.

## Anti-Patterns

| Avoid | Prefer |
| --- | --- |
| Jumping to implementation | Options + recommendation first |
| Writing a full spec during Explore | Transition to Specify when scope is clear |
| Guessing auth/data choices | `[NEEDS CLARIFICATION: ...]` markers |

## Next

- Scope is clear → `feature-init` then `specify.md`
- Details missing but direction chosen → `elicitation.md` (feature scope)
- Gray areas remain → `discuss.md` inside Specify
- Back → `agent-architecture.md`
