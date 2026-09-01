# Gates and guarantees

**Product view:** [Guarantees matrix](Guarantees-matrix.md) — guarantee → mechanism → Process vs Brakes.

**Who this is for:** anyone who wonders *“what does Spec Guardrails actually enforce?”*

The short answer: it **blocks** incomplete **markdown artifacts** (missing sections, empty placeholders, missing REQ coverage lines, weak evidence citations in `validation.md`) and **guides** the rest (judgment, how you write specs). Gates do **not** prove that source code implements a criterion — they check paperwork structure.

## Freeze (do not loosen)

These guarantees are locked for the **0.7.x** line onward unless a major revises the contract. Changing them needs a clear reason (see [Stability policy](Stability-policy.md)).

| Guarantee | What it means in practice |
|-----------|---------------------------|
| **Hub + sisters always install** | Planning, building, and checking aren’t optional pieces of the kit (hub + **ten** sister skills, including `python-devops` and `ai-engineering` since 4.7). |
| **Specify before Verify** | You can’t “finish” without a written plan the gates can check against. |
| **`.specs/` is the memory** | Plans and status live in the repo, not only in chat. |
| **Structural gates stay on** | Thin specs, missing task fields, open task checkboxes, and missing evidence *citations* fail the gate. |
| **Conditional sisters** | Extra reviews (security, QA, simplify, ship, platform infra/AI) load only when paths or tier match — **one at a time** for AppSec/QA. |
| **Python gate scripts stay frozen** | The automated checker’s behavior doesn’t drift casually. |

Full freeze text: [ADR 0001](../adr/0001-harness-freeze-v0.7.md).

## What the gate **blocks** (hard)

When you claim you’re done, the gate looks for **structured artifacts** — not vibes:

- Spec folder and plan documents present  
- Required sections / REQ IDs / task shape in markdown  
- `validation.md` with a PASS verdict and `file:line` evidence citations  
- REQ IDs covered by tasks (`analyze-artifacts` / `validate-traceability`) and by coverage lines (`validate-state` / `validate-traceability`)  
- Status that matches a finished flow (no open task checkboxes)

**Honest limit:** citing `test/foo.test.ts:12` next to `REQ-001` does **not** prove that line asserts the acceptance criterion. Gates validate the **traceability paperwork**, not semantic test↔REQ alignment.

If those artifacts aren’t there, **done** doesn’t stick.

## Run the brakes yourself

Same checks the agent should run — from your shell after install:

```bash
npx @luizsantiago/spec-guardrails validate-spec auth
npx @luizsantiago/spec-guardrails validate-traceability auth
npx @luizsantiago/spec-guardrails validate-ship-surface auth   # when infra/AI paths in tasks
npx @luizsantiago/spec-guardrails check-commit --message "feat(auth): add token refresh"
npx @luizsantiago/spec-guardrails lessons list --status confirmed
```

| Command | Catches |
| --- | --- |
| `validate-spec` | Thin or incomplete written goals |
| `validate-traceability` | REQ missing from tasks or from validation coverage lines |
| `validate-ship-surface` | Infra/AI task paths without Ship/AI Surface in `design.md` |
| `check-commit` | Sloppy commit titles |
| `lessons list --status confirmed` | Nothing broken — lists hard-won rules to reuse |

Fail → fix the file → re-run. Full reject lists: [Gates reference](gates.md) · [README — Install & gates](https://github.com/luizssantiago92/spec-guardrails#install).


## What the gate **does not** fully enforce

These stay in the **guides** (judgment and authoring quality):

| Topic | Why it isn’t a hard gate |
|-------|---------------------------|
| How deep a discussion went | Conversation quality isn’t a file checksum. |
| Exact shape of every plan section | Authoring skill, not a parser. |
| Perfect task graphs | Guidance + templates; not a full dependency engine. |
| “Did we talk enough before coding?” | Process habit—skills teach it; the gate doesn’t score chats. |
| “Does this test assert REQ-001?” | Semantic — out of scope for structural gates. |
| “Is this source file a stub?” | Gates read `.specs/` markdown, not your implementation AST. |

**Rule of thumb:** if it isn’t in the freeze table or the gate scripts, don’t promise users that Spec Guardrails “guarantees” it.

## Adversarial matrix

A large suite of failure cases must keep failing. That stops “helpful” edits from accidentally making the gate too soft.

Details: [`test/test_adversarial_gates.py`](../../test/test_adversarial_gates.py), [`test/test_validate_traceability.py`](../../test/test_validate_traceability.py), and [CONTRIBUTING](../../CONTRIBUTING.md).

## Related

- [Guarantees matrix](Guarantees-matrix.md) — product promises → mechanisms  
- [How it works](How-it-works.md) — full journey and sisters  
- [Token efficiency](Token-efficiency.md) — why not everything loads at once  
- [FAQ](FAQ.md)
