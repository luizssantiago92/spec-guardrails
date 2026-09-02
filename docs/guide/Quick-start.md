# Quick start

Get from zero to “the guardrails is watching” in about ten minutes.

## 1. Install

In your project folder (not in the Spec Guardrails source repo):

    npx @luizsantiago/spec-guardrails install

You should see skills land in **your detected platform tree** (for example `.cursor/skills/` in Cursor), that platform's adapter entry file, a `.specs/` folder, and Python gate scripts for **Brakes mode**. Multi-agent repos can use `install --all-platforms`; see [Platform parity](Platform-parity.md).

Optional sanity check:

    npx @luizsantiago/spec-guardrails doctor

## 2. Tell your agent what you want

Open your **AI coding agent** in this project (use the adapter entry file for your tool — see [Platform parity](Platform-parity.md)) and say something concrete, for example:

> Specify a small feature: users can sign in with email and password and get a session. Keep social login out of scope.

Ask it to follow the installed guardrails (the Spec-Driven / hub skill).

**Agent commands** (`/specify`, `/loop`, `/verify`, …) are chat phrases — not shell commands. Summary table: [Agent commands](agent-commands.md).

## 3. Watch for the written goal

You should get a short write-up: what must happen, what’s assumed, what’s out of scope.

If the agent tries to jump straight into code, nudge it:

> Stop. Finish the written goal and run the specify check first.

## 4. Approve a small shopping list (if the work isn’t tiny)

For anything bigger than a quick fix, ask for tasks: small jobs with a clear “done when”.

Then let it build **one job at a time**.

## 5. Finish with a real review

When the jobs are done, ask for Verify in a **fresh** pass: proof linked to tests, not “trust me”.

If the report still lists open gaps, it isn’t done.

## What “good” looks like after ten minutes

- The guardrails files are installed  
- There’s a written goal you actually agree with  
- The agent isn’t inventing a giant PR in silence  
- You know the next step (do job 1, or fix a failed check)

## Everyday checks (optional CLI)

After install, you can run the same brakes from the terminal. Think of them as “is this paperwork honest?” — not as a full product test suite.

```bash
# Is the written goal complete enough?
npx @luizsantiago/spec-guardrails validate-spec auth

# Does this commit message follow the house style?
npx @luizsantiago/spec-guardrails check-commit --message "feat(auth): add token refresh"

# What lessons has the project already confirmed?
npx @luizsantiago/spec-guardrails lessons list --status confirmed
```

Replace `auth` with your feature folder name under `.specs/features/`. A non-zero exit means: stop, fix the artifact, run again.

| Command | Plain meaning |
| --- | --- |
| `validate-spec` | The written goal has the required sections and real criteria |
| `check-commit` | The commit title looks Conventional (type, length, no trailing period) |
| `lessons list` | Show rules the team already promoted — candidates stay hidden |

More gates (tasks, loop-plan, “are we actually done?”): [Gates reference](gates.md) · [Guarantees matrix](Guarantees-matrix.md).

### Optional: CI and pre-commit

- **Pull requests:** copy `templates/ci/guardrails-pr.yml` from the package into `.github/workflows/` — runs spec/tasks/state gates on PRs. See [Gates → CI template](gates.md#ci-template-integration-phase).
- **Local commits:** `npx @luizsantiago/spec-guardrails install-hooks` — opt-in Conventional Commits check on staged files.
- **Operational cadence (5.0+):** `npx @luizsantiago/spec-guardrails loop list` — triage, CI, deps patterns. See [Loop patterns](loop-patterns.md).

## If something feels stuck

- **No Python?** Node alone is enough — the agent follows the same phases and checklists manually. Install Python 3.10+ when you want automatic proof at each step (Brakes mode).  
- **Agent ignores the guardrails?** Point it at `.cursor/skills/agent-architecture.md` and say “follow this”.  
- **Want the big picture?** → [How it works](How-it-works.md)  
- **Want the brakes explained?** → [Gates and guarantees](Gates-and-guarantees.md)  

## Next

- **Hands-on paths** → [Tutorials](tutorials/README.md) (Quick → Medium → Parallel)
- **Full picture** → [Overview](Overview.md)  
- Save money on context → [Token efficiency](Token-efficiency.md)  
- Common questions → [FAQ](FAQ.md)  
- Memory and search → [Memory](Memory.md)  
- Back → [Home](Home.md)
