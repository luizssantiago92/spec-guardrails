# Task Graph Engineering

Design the **topology** of agent work — which jobs run, in what order, and what can run in parallel.
Sister skill to `agent-architecture.md` — SDD defines *when* (phases); this skill defines *how jobs connect* within Execute and Verify.

Adapted from task-graph orchestration patterns (MIT). Knowledge-graph content intentionally omitted — this skill covers agent orchestration only.

## When to Use

- Breaking down `/tasks` for multi-step or multi-file features
- Planning parallel subagent work before `/loop`
- Deciding whether to spawn multiple agents or keep one sequential context
- Structuring `/verify` with separate verifier contexts (diamond pattern)
- Any feature where tasks have real dependencies — or look independent but aren't

## Sister Skills (use together)

| Skill | Role |
| --- | --- |
| `agent-architecture.md` | Process — hub, contract, complexity router |
| `engineering-standards.md` | Quality — one writer per file, commit format |
| `security-review.md` | Verification — OWASP checklist for `/verify` |
| `git-handoff.md` | Persistence — git sync for `.specs/` |
| **`task-graph-engineering.md`** | **Topology — DAG of jobs, parallelism, verify separation** |

## Core Model

A **task graph** is a DAG (directed acyclic graph):

- **Nodes** = jobs (one unit of work you'd hand to a single agent)
- **Edges** = real dependencies (job B needs job A's *output*, not just "comes after")

Draw the graph in `.specs/features/[feature]/task-graph.md` before `/loop` when the feature has 3+ tasks or any parallel work.

```markdown
## Task Graph: [feature]

| Node | Depends on | Parallel group | Owner |
| --- | --- | --- | --- |
| Task 1: schema | — | A | agent-1 |
| Task 2: types | — | A | agent-2 |
| Task 3: API | 1, 2 | — | agent-1 |
| Verify | 3 | — | verifier (clean context) |
| Merge + handoff | Verify | — | merge owner |
```

## The Stop Rule

Before parallelizing, ask: *where does work split into pieces that never read each other's results?*

| Work shape | Strategy |
| --- | --- |
| **Splittable** — independent files, modules, or research angles | Parallel workers → separate verify → one merge owner |
| **Sequential** — each step needs the full picture from the previous step | Single agent, no fan-out |

Multi-agent setups win on splittable work and **lose** on sequential work. More agents is not a strategy — the shape of the work decides.

## Fake Edges

For every "and then" in a task list, ask: does the next job actually read the previous job's output?

- **Real edge**: Task B imports or depends on artifacts from Task A → keep the dependency
- **Fake edge**: "Write tests and then update README" when README doesn't use test output → delete the edge; run in parallel or reorder

Most hand-built task lists contain 2–3 fake edges. Removing them unlocks safe parallelism.

## The Diamond Pattern

The shape serious systems converge to for splittable work:

| Stage | What runs | Notes |
| --- | --- | --- |
| Plan | Single planner | Produces `tasks.md` + `task-graph.md` |
| Workers | 1–3 parallel agents | Disjoint file ownership only |
| Batch review | Orchestrator (two stages) | Spec compliance, then code quality — before merge |
| Verify | Fresh verifier context | Never the code author |
| Merge | One merge owner | Resolves conflicts, runs harness |
| Result | Commits + evidence | Handoff to `/archive` when done |

Rules:

1. **Split** only at real boundaries (see Stop Rule)
2. **Workers** run in parallel with disjoint file ownership (see engineering-standards)
3. **Verify** in a **separate context** — never the code author; ask diverse questions (correct? current? tested?)
4. **Merge** has one owner who resolves conflicts and runs the project harness

Maps to SDD: `/tasks` → `/loop` (workers) → `/verify` (diamond verify node) → `/handoff` (merge + persist).

## Sub-Agent Delegation

**Trigger** — Count the tasks. Roughly **8 or fewer** fits one batch: execute inline. More than that: offer sub-agents.

**Offer-then-confirm** — Never auto-spawn. Present the proposed split and wait for the owner to accept.

**Batching**

- A **batch** is the execution unit: one or more consecutive whole phases packed to about **7 tasks**.
- Phases stay the semantic unit — never split a phase across workers.
- Batches run **sequentially**; a batch starts only after the previous one reports every task complete.
- Each worker implements → gates → commits each of its tasks in order, then reports a compact summary: tasks done, commit hashes, test counts, deviations.
- Workers never spawn further sub-agents.

Full operational contract (worker payload, compact summary template, failure table, merge owner steps): `references/sub-agents.md`.

**Verifier** — After the final task, dispatch a fresh verifier regardless of batch count. It is the closing step of Execute, never prompted. See `references/validate.md`.

**Model tier per role** — When Spec Guardrails allows choosing a model per sub-agent:

| Role | Tier |
| --- | --- |
| Mechanical batch (config, wiring, CRUD) | Fast / cost-effective |
| Core-domain or ambiguous batch | High reasoning |
| Design phase | High reasoning |
| Verifier | Mid-to-high — adversarial reasoning, mutant design |

If Spec Guardrails cannot set a per-agent model, ignore this and invest more care on the heavy steps.

## Human Gate

Route **irreversible** actions through explicit human approval:

- Deploy, publish, push to shared branch
- Delete data, refund, send external communications
- Merge to main/production

**Placement rule**: gate where a mistake is expensive to undo — not on every step.

| Action | Gate? |
| --- | --- |
| Local commit | No (handoff handles this) |
| `git push` | Yes — human or explicit instruction |
| Deploy / release | Yes — always |
| Continue after 3 failed correction loops | Yes — escalate to human |

## Guardrails

1. **Max correction loops** — 3 per task, then escalate (see `agent-architecture.md`)
2. **One writer per file** — no two jobs mutate the same file in the same round
3. **Plan in writing** — routing lives in `task-graph.md` and `tasks.md`; agents fill jobs, not the plan
4. **Cap subagents** — hard limit on parallel agents (default: 3 workers + 1 verifier)
5. **Evidence over self-report** — judge on harness output (tests ran, linter passed), not agent claims

## Integration with SDD Phases

| SDD Phase | Task graph action |
| --- | --- |
| `/tasks` | Identify fake edges; mark parallel groups; link to REQ IDs |
| `/task-graph` | Draw or revise the DAG in `task-graph.md` |
| `/loop` | Execute graph — `loop-plan` each round; parallel sub-agents when files are disjoint |
| `/verify` | Diamond verify node — clean context, diverse checks |
| `/handoff` | Commit `task-graph.md` with other `.specs/` artifacts |

## When NOT to Use

Skip the task graph for:

- Single-file bug fixes
- Copy or config-only changes
- Trivial changes covered by the complexity router in `agent-architecture.md`

## Available Commands

| Command | Action |
| --- | --- |
| `/task-graph` | Draw or revise DAG in `.specs/features/[feature]/task-graph.md` |
| `/tasks` | Atomic breakdown — apply fake-edge and stop-rule checks |
| `/loop` | Execute graph respecting parallelism and one-writer-per-file |
| `/verify` | Independent verification (diamond verify node) |

## Related Skills

- `agent-architecture.md` — SDD hub, contract, complexity router
- `references/tasks.md` — task schema and the `validate_tasks.py` gate
- `references/validate.md` — verifier procedure for the diamond verify node
- `engineering-standards.md` — one writer per file, git hygiene
- `security-review.md` — security checklist for verify node
- `git-handoff.md` — commit `task-graph.md` at phase boundaries

## Credits

Task-graph patterns adapted under MIT license from [graph-engineering](https://github.com/codejunkie99/graph-engineering) (task-graph half only).
