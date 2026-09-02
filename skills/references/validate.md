# Validate

Independent verification of the delivered feature. Always required, never prompted.

## When to Use

- After the last task of a feature is committed
- After any fix round that follows a FAIL verdict

## Who Runs It

A **fresh verifier context that never wrote the code**. Author ≠ verifier is non-negotiable. The verifier re-derives coverage from the spec instead of inheriting the author's mental model.

When sub-agents are available, dispatch the verifier as a separate agent (see `task-graph-engineering.md`). Without sub-agents, start a clean context and run this file as a fresh-eyes pass.

## Inputs

- `spec.md` acceptance criteria, `context.md` when it exists
- The diff range for the feature
- `security-review.md` for the security checklist
- `appsec.md` only when Complex or an attack-surface trigger fires — then **drop** it before QA
- `qa-strategy.md` only when Complex, multi-step UI, or an explicit regression ask — never together with `appsec.md`
- Do **not** load `ship-ready.md` or `code-simplify.md` during Verify (ship is owner-triggered after PASS; simplify is Execute-side)
- `context-limits.md` — load the spec, the diff, and the tests the spec names; do not load the author's chat; at most one conditional sister at a time

## Output

`.specs/features/[feature]/validation.md`

## Procedure

### 1. Spec-anchored outcome check

For each acceptance criterion, confirm that a test asserts the **spec-defined outcome** — not merely that the code runs. Flag criteria where the test asserts an implementation detail, and flag spec text too imprecise to test.

### 2. Discrimination sensor

Confirm the tests can actually fail:

1. Inject behavior-level faults one at a time in an **isolated scratch copy** — a temp worktree or file copies. Never use `git stash` and never mutate the working tree.
2. Confirm the relevant test fails for each mutant.
3. Discard the scratch and verify the real tree is unchanged (`git status --porcelain` matches the pre-sensor baseline).
4. Any mutant that survives becomes a fix task — the tests do not discriminate.

### 3. Security review

Run the checklist in `security-review.md`. Features with no auth, API, input, payment, or infrastructure surface may take the documented lightweight path — with the justification written into the report.

### 4. Evidence-or-zero

A requirement is satisfied only with a `file:line` reference to an assertive test that passes. No reference means not done, regardless of how the code looks.

### 5. Conditional AppSec (optional)

If the hub AppSec trigger fires, load **only** `appsec.md`, write `## AppSec` (or `skipped — reason`), then **drop** that skill from context. Do not load `qa-strategy.md` yet. If the trigger does not fire, record a one-line skip. Judgment only — not gated.

### 6. Conditional QA (optional)

If the hub QA trigger fires, load **only** `qa-strategy.md` (after AppSec is done or skipped), write `## QA`, then continue. Judgment only — not gated.

### 7. Verdict

Write `validation.md`, then run the completion gate.

## Mutant catalog

Pick mutants from the kind of code that landed, not from a generic list. One killed mutant per risky behavior is the minimum; surviving mutants are fix tasks.

| Code kind | Mutant | Expected killer |
| --- | --- | --- |
| Auth / session | Skip the expiry check; accept an empty token; invert role comparison | Test that names the denied case |
| HTTP handler | Return 200 on the error path; swap 401/403; drop the error code body | Status + code assertion |
| Validation | Remove an upper/lower bound; accept the empty string; skip a required field | Boundary test |
| Persistence | Skip the unique constraint; write without a transaction; ignore not-found | Duplicate / rollback / 404 test |
| Payments / money | Off-by-one on minor units; skip idempotency key; apply a refund twice | Amount and replay tests |
| Concurrency | Drop a lock or compare-and-swap; process the same event twice | Idempotency or conflict test |
| State machine | Allow a backward transition; skip the terminal-state guard | Illegal-transition test |

A mutant that the compiler or typechecker rejects before a test runs does not count. Change behavior, not syntax.

**Weak assertion tells.** Treat the test as weak when it asserts any of: `toBeDefined()`, a 2xx status with no body, "the function was called", or a snapshot of an entire module. The spec names an outcome; the test must name it too (status + error code, exact field, exact transition).

Do not inject mutants that the spec does not constrain. A surviving mutant of unspecified behavior is a spec gap, not a test gap — send it back to Specify.

## Gap catalog

Every FAIL names a gap type so the author knows which loop to re-enter.

| Gap | Meaning | Return to |
| --- | --- | --- |
| Missing evidence | No `file:line` for a criterion | Execute — add the assertion |
| Weak assertion | Test checks that code ran, not the spec outcome | Execute — rewrite the test |
| Surviving mutant | Discriminating test is absent | Execute — add the killer test, then the production fix if needed |
| Imprecise criterion | Spec cannot be tested as written | Specify — rewrite with `SHALL`/`MUST` and a trigger |
| Spec deviation | Implementation does something the spec forbids, or omits something it requires | Specify + Execute |
| Security finding | Checklist item failed | Execute — fix, then re-verify |
| Open task | `tasks.md` still has `- [ ]` | Execute — finish or drop the task with owner approval |
| Sensor skipped | No mutant outcome in the report | Verify — run the sensor. On **Medium+** (`design.md` with content, 4+ tasks, or 2+ phases) do not pass — the completion gate blocks. Below Medium+ the gate warns (`--strict` promotes); still run the sensor when risk warrants it |

Rank gaps: security and spec deviation first, then surviving mutants, then missing evidence, then imprecise criteria. The author fixes in that order.

## Evidence format

The completion gate searches for `file:line` (for example `test/routes/login.test.ts:24`). A URL, a CI job name, or "covered by the suite" is not evidence.

- Cite the assertive test, not the production file
- One evidence line per criterion; reuse a test only when it truly asserts both outcomes
- After a fix round, cite the new line numbers — stale citations fail the reader even if they pass the regex

## Gate

```bash
python3 .specs/guardrails/scripts/validate_ship_surface.py [feature]   # when infra/AI paths in tasks
python3 .specs/guardrails/scripts/validate_state.py .specs/features/[feature]
python3 .specs/guardrails/scripts/validate_state.py [feature]
python3 .specs/guardrails/scripts/validate_state.py          # single-feature projects
npx @luizsantiago/spec-guardrails quality-checks             # when quality.checks is configured
```

**Ship / AI surfaces (python-platform).** When `design.md` documents Ship or AI Surface, cite deploy/eval evidence in the report (CI workflow path, eval command output, or `file:line` from `tests/eval/`). `validate_ship_surface.py` checks design structure only — not eval quality or deploy safety.

Checks that the report exists, the verdict is exactly PASS in the **preamble** (before the first `##` section) or under a dedicated `## Verdict` / `## Result` / `## Status` heading, every spec requirement ID shares a line with test `file:line` evidence, and no task remains open. A `- Verdict: PASS` buried under Discrimination Sensor or Coverage does not count. Preamble and `## Verdict` must not disagree. Evidence inside fenced samples or HTML comments does not count. `PASS` with any surviving mutant on a sensor/mutant line fails. `PASS` with open `Gaps` bullets or Security Review `Result: fail` fails. On Medium+ features (`design.md` with content, 4+ tasks, or 2+ phases) a discrimination-sensor **outcome** is **blocking** — the section heading alone is not enough — and a Medium+ `PASS` requires at least one `killed` mutant in the sensor focus (`injected` alone, or `killed` only under Gaps, is not enough). Below Medium+ a missing outcome is a warning (`--strict` still promotes warnings). Non-zero exit means the feature is not done.

The gate cannot judge whether a cited test actually asserts the criterion. Run `quality-checks` when `.specs/config.yaml` lists project commands (`npm test`, …) and cite the passing output in the validation report. That judgment is still the verifier's; a green gate with a weak assertion is still a FAIL in the report.

**Gate-enforced vs verifier judgment.** `validate_state.py` enforces form: verdict scope, test-path evidence, REQ↔evidence lines, sensor outcomes on Medium+, open Gaps, Security `Result: fail`, open tasks. The following stay **verifier judgment** (not structural gates): whether each coverage row's test truly asserts the outcome, whether a lightweight Security path is justified, Interactive UAT / walkthrough success, and optional `## AppSec` / `## QA` sections. See the [gate stability contract](https://github.com/luizssantiago92/spec-guardrails/blob/main/prd/gate-stability.md).

**Red flags before PASS (judgment):** evidence only in fences/comments; open Gaps with PASS; soft `PASS WITH GAPS`; verdict buried under Sensor/Coverage; config path as evidence; surviving mutant or Medium+ without a kill — these already fail the gate or the reader.

## Template

```markdown
# Validation: [Feature]

- Verifier: independent agent (clean context)
- Verifier-Mode: fresh_chat | subagent | same_session
- Date: [ISO date]
- Diff range: [base..head]
- Verdict: PASS

## Coverage

| Requirement | Test evidence | Result |
| --- | --- | --- |
| REQ-001 | test/routes/login.test.ts:24 | pass |
| REQ-002 | test/auth/token.test.ts:41 | pass |

## Discrimination Sensor

| Mutant | Expected killer | Result |
| --- | --- | --- |
| Removed expiry check | test/auth/token.test.ts:41 | killed |

## Security Review
[Full checklist result, or the justified lightweight path.]

## AppSec
- Applied: yes | skipped — [reason]
- Boundaries: ...
- Top risks: ...
- Result: pass | fail | escalate | skipped

## QA
- Applied: yes | skipped — [reason]
- Smoke: ...
- Regression focus: ...
- Result: pass | fail | skipped

## Gaps
[Ranked list, or "none".]

## Interactive UAT
- Applied: yes | skipped — [reason]
- Steps:
  1. [action] → expect [observable]
  2. [action] → expect [observable]
- Result: pass | fail | skipped
```

Lightweight security path (only when the feature has no auth, API, input, payment, or infrastructure surface):

```markdown
## Security Review
- Path: lightweight
- Justification: copy change in docs/README.md, no input or trust boundary
- Result: not applicable
```

An unjustified lightweight path is a gap.

## Failure Handling

**PASS requirements.** Write `Verdict: PASS` only when every coverage row passes (verifier judgment); no surviving mutant appears on a sensor/mutant line (gate blocks that); on Medium+ a sensor **outcome** is present and at least one mutant is `killed` (below Medium+ a missing outcome is a gate warning unless `--strict`); Security is pass or a justified lightweight path (gate blocks `Result: fail`; justification quality is verifier judgment); Gaps is `none` (gate blocks open Gaps bullets); AppSec/QA/Interactive UAT are pass or correctly skipped when their triggers apply (verifier judgment; not gated); and `validate_state.py` exits 0. Anything else is FAIL — do not write PASS and list gaps underneath.

- FAIL verdict → gaps become fix tasks; return to `implement.md`.
- The fix → re-verify loop is bounded to **3 iterations**, then escalate to the owner with the blocking gap.
- Every grounded failure — surviving mutant, imprecise spec, failed criterion — is recorded with `lessons.py add --source` pointing at this `validation.md`. A clean PASS records nothing. See `lessons.md`.

## Interactive UAT

Lean walkthrough for **Complex-tier user-facing** work (UI or a human-observable flow). Backend-only, infra, or library changes: skip and record one line in the report (`Interactive UAT: skipped — no user-facing surface`). Not Complex, or not user-facing: skip the same way. Prefer running UAT **after** conditional AppSec/QA steps when those ran.

**When applied**

1. After the automated coverage / sensor / security pass, write a numbered script: each step is `action → expected observable outcome`.
2. If the owner is in the session, run **one step at a time** and wait for a reply. Otherwise hand them the script.
3. Interpret replies as: **pass** (“yes” / “works” / “next”), **skip** (“can’t test” / “n/a”), or **issue** (anything else — log the words, add a Gaps bullet, open a fix task).

**FAIL rule.** Automated structural PASS with a failed walkthrough is still a FAIL for the verifier: do not leave `Verdict: PASS` while UAT Result is fail. Put the issue under Gaps and return to Execute. **Interactive UAT is verifier judgment; `validate_state.py` does not require this section and does not run the walkthrough.**

## Next

After `validate_state.py` passes → `archive.md` to fold the feature into domain truth and reset STATE.

Otherwise → `memory.md` and `git-handoff.md` — record decisions, commit `.specs/`, hand off.
