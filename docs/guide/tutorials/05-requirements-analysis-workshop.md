# Tutorial 05 — Requirements analysis workshop

Hands-on path for the **traditional SDLC requirements analysis** phase using `/elicit`, briefs, and gates — before `/specify`.

**Time:** ~30 minutes  
**Prerequisites:** `npx @luizsantiago/spec-guardrails install` and Python 3.10+ for Brakes.

## 1. When to run this workshop

Run when:

- The kickoff is vague ("add settings", "improve auth")
- A PRD exists but gaps remain
- The feature is **Complex** (architecture, auth, payments, infra)

Skip when the request is already testable — go straight to `/specify`.

## 2. Discover sources

```bash
npx @luizsantiago/spec-guardrails req-analysis discover
```

Paste or save inputs to `.specs/project/kickoff.md`, `prd.md`, or `docs/brief.md`.

## 3. Scaffold the brief

```bash
npx @luizsantiago/spec-guardrails req-analysis init "settings page" --scope feature
```

Owner and agent close **Open questions** until the brief is approvable.

## 4. Gate the brief

```bash
npx @luizsantiago/spec-guardrails req-analysis validate
```

Fix until exit code `0`. Owner records **Approved: yes** and date.

## 5. Specify without re-asking

```bash
npx @luizsantiago/spec-guardrails feature-init "settings page"
# /specify — derive spec.md from the brief
npx @luizsantiago/spec-guardrails validate-spec
```

### Optional policy (`.specs/config.yaml`)

```yaml
elicitation:
  require_brief: false
  require_brief_complex: true
  require_nfr_complex: warn
```

When `require_brief_complex` is true, Complex-tier features **must** have an approved brief before `validate-spec` passes.

Add `## Non-Functional Requirements` to the spec for performance, security, or availability constraints.

## 6. Drift check (brief ↔ spec)

After `/specify`:

```bash
npx @luizsantiago/spec-guardrails req-analysis diff
```

Every **Capabilities** bullet from the brief should map to a REQ in `spec.md`. Fix gaps before task approval.

## 7. Next steps

- Discuss (if product gray areas remain) → `discuss.md`
- Design (Complex) → `design.md` + `validate-design`
- Tasks → `validate-tasks` + `analyze-artifacts`

## Related

- [Requirements analysis](../requirements-analysis.md)
- [Agent commands](../agent-commands.md)
- [Tutorial index](README.md)
