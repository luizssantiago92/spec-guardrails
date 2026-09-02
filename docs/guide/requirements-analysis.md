# Requirements analysis

Structured discovery **before** the agent writes a formal spec. Use this when the request is still fuzzy — a one-liner, a kickoff document with gaps, or a roadmap item that needs detail.

Chat: the agent suggests **`/elicit`**. CLI scaffold: `req-analysis init`.

---

## When it helps

| Situation | Scope |
| --- | --- |
| You pasted a PRD or kickoff and want gaps closed | **Project** — `.specs/project/requirements-brief.md` |
| "Add a settings page" or "improve login" with missing detail | **Feature** — `.specs/project/feature-briefs/<slug>/requirements-brief.md` |
| Brownfield repo just got Spec Guardrails | **Project** — enrich `PROJECT.md` and `ROADMAP.md` before the first feature |
| Request is already testable and scoped | **Skip** — go straight to Specify |

**Suggest by default.** If you prefer Specify directly, the agent proceeds — unless `.specs/config.yaml` sets `elicitation.require_brief` or `require_brief_complex` (see below).

---

## Policy (optional — `.specs/config.yaml`)

```yaml
elicitation:
  require_brief: false          # when true, every feature needs an approved brief before validate-spec
  require_brief_complex: true   # Complex-tier features need a brief (default)
  require_nfr_complex: warn     # warn | error | off — NFR section on Complex specs
```

Workshop walkthrough: [Tutorial 05 — Requirements analysis](tutorials/05-requirements-analysis-workshop.md)

---

## What you experience

1. **You describe the work** — in chat or by pointing at `prd.md`, `docs/brief.md`, or `.specs/project/kickoff.md`.
2. **The agent reads first** — kickoff files, `PROJECT.md`, `ROADMAP.md`, and relevant code. It cites sources before asking (`kickoff §Goal already says X — confirm?`).
3. **Short Q&A rounds** — at most **five questions per round**, **one topic at a time** (UI *or* API *or* data), always with options A/B/C and a recommendation. It does not re-ask what your documents already answer.
4. **You approve the brief** — explicit yes and date. Open questions must be closed before Specify.
5. **Specify starts** — the agent formalizes `spec.md` from the brief without repeating resolved questions.

If the project is already in progress, the agent reads `STATE.md` and continues — it does not restart from zero.

---

## Drift check (brief ↔ spec)

After `/specify`:

```bash
npx @luizsantiago/spec-guardrails req-analysis diff
```

Flags **Capabilities** bullets from the brief that have no heuristic REQ mapping in `spec.md`.

---

## Gate before Specify (Brakes mode)

| Scope | Primary file | Also updates |
| --- | --- | --- |
| Project | `.specs/project/requirements-brief.md` | Suggested feature slugs on `ROADMAP.md` |
| Feature | `.specs/project/feature-briefs/<slug>/requirements-brief.md` | — |

Required brief sections: **Goal**, **Context sources**, **Current state**, **Capabilities**, **Constraints & out of scope**, **Resolved questions**, **Open questions** (`- none` when done), **Owner approval**.

---

## Validate brief (Brakes mode)

When Python is available:

```bash
npx @luizsantiago/spec-guardrails req-analysis validate
```

Blocks when: open questions remain, owner approval is missing, or clarification markers are still in the brief.

Without Python, the agent runs the same checklist manually.

---

## CLI helpers

```bash
npx @luizsantiago/spec-guardrails req-analysis init "description" --scope project
npx @luizsantiago/spec-guardrails req-analysis discover
npx @luizsantiago/spec-guardrails req-analysis context --scope feature --slug settings-page
npx @luizsantiago/spec-guardrails req-analysis promote --scope feature
npx @luizsantiago/spec-guardrails req-analysis diff
```

Full command reference: [Agent commands → /elicit](agent-commands.md)

---

## Related

- [Overview → Three ways to start](Overview.md#three-ways-to-start-pick-one)
- [Concepts → Complexity tiers](concepts.md#complexity-tiers--how-the-agent-chooses-depth)
- Phase procedure (maintainers): `skills/references/elicitation.md`
