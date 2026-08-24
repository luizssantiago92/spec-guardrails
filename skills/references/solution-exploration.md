# Solution Exploration

Compare multiple candidate implementations from the same **approved spec** before committing to one approach. Explicit mode — not the default Execute path.

## When to Use

- Two or more defensible architectures or libraries for the same requirements
- High-stakes design fork (auth strategy, persistence, messaging, language/runtime choice)
- Owner asked to spike and compare before `/loop`

## When NOT to Use

- Ordinary Execute with an approved design and tasks — use `implement.md`
- Pre-spec ideation — use `explore.md` instead
- Quick tier (≤3 files) — use `quick-mode.md`

## Prerequisites

- Approved `spec.md` (`validate-spec` PASS)
- Git repository (worktrees for isolation)
- Owner approval to explore **multiple** implementations (higher blast radius than single-path Execute)

## Outputs

- `.specs/features/[feature]/exploration.md` — candidates, comparison matrix, decision
- Isolated workspaces under `.specs/workspaces/[feature]/candidate-<id>/`

## Procedure

1. **Confirm the spec is approved** — run `validate-spec` if uncertain.
2. **Initialize exploration** (owner OK required):
   ```bash
   npx @luizsantiago/spec-guardrails solution-explore init <feature> --candidates A,B,C
   ```
   Optional labels: `--labels "Redis,Postgres,Hybrid"`.
3. **Implement each candidate in its workspace** — one candidate per worktree; no cross-contamination. Production-quality spikes only if the owner expects mergeable code; otherwise time-boxed prototypes with evidence.
4. **Fill the comparison matrix** in `exploration.md` for every criterion:
   - Spec compliance
   - Test results
   - Complexity
   - Maintainability
   - Performance
   - Risk
5. **Validate before deciding**:
   ```bash
   npx @luizsantiago/spec-guardrails solution-explore validate <feature>
   ```
6. **Record the decision** (owner picks):
   ```bash
   npx @luizsantiago/spec-guardrails solution-explore select <feature> \
     --candidate A --rationale "Best spec fit and lowest operational risk"
   ```
   Optional merge: `--merge B`. Optional cleanup of losing worktrees: `--cleanup`.
7. **Promote the winner** — merge chosen work into the main tree, update `design.md` / `tasks.md` if needed, then continue normal Execute on the main branch.

## Rules

- **Explicit opt-in** — never spawn parallel solution paths without owner approval.
- **Same spec** — all candidates implement the same approved requirements; gaps go back to Specify.
- **Evidence over opinion** — comparison cells cite tests, benchmarks, or concrete observations.
- **One decision** — after `select`, exploration is closed; do not restart without a new feature or owner direction.
- **Independent verify still applies** — `/verify` runs on the merged result, not on exploration chat summaries.

## Gates and CLI

| Step | Command |
| --- | --- |
| Init | `solution-explore init <feature> --candidates A,B` |
| Status | `solution-explore status [feature]` |
| Before select | `solution-explore validate [feature]` |
| Decide | `solution-explore select <feature> --candidate A --rationale "…"` |

## Anti-Patterns

| Avoid | Prefer |
| --- | --- |
| Exploring without an approved spec | `validate-spec` then `solution-explore init` |
| Mixing candidates in one worktree | One worktree per candidate id |
| Skipping the comparison matrix | Fill all criteria before `select` |
| Default parallel Execute for every feature | Solution exploration only when trade-offs are real |

## Next

- Decision recorded → update `design.md`, resume `tasks.md` / `implement.md`
- Spec gaps found → `converge.md` or update `spec.md`
- Back → `agent-architecture.md`
