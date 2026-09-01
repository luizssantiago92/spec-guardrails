# Security Review

Independent security checklist for the **Verify** phase.
Use alongside `agent-architecture.md` and `engineering-standards.md`.

## When to Use

- Running `/verify` on any feature touching auth, data, APIs, or infrastructure
- Before merging PRs that handle user input, payments, or sensitive data
- After dependency updates (supply chain review)

## Lightweight Path (non-security changes)

For changes with **no** auth, API, user input, payments, or infrastructure impact (e.g. copy, docs, pure UI styling):

1. Verifier still uses clean context (Author ≠ verifier)
2. Run discrimination sensor on affected tests
3. Document in `validation.md`:

```markdown
## Security Review — Skipped (justified)
- Reason: [no auth/API/input surface touched]
- Mutants tested: [list]
- Evidence: [file:line references]
```

Full OWASP checklist remains mandatory for anything touching auth, data, APIs, or infra.

## Third-party agent skills (supply chain)

Spec Guardrails ships skills you install with `npx @luizsantiago/spec-guardrails install`. When adding **other** skill packs from GitHub, marketplaces (`skills.sh`, plugin stores), or zip files:

1. **Read before trust** — inspect `SKILL.md` and any bundled scripts; skills run with agent privileges.
2. **Scan when risk is non-trivial** — use [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) for static (and optional LLM) analysis before install:

   ```bash
   skillspector scan https://github.com/user/some-skill --no-llm
   ```

3. **Prefer signed catalogs** — NVIDIA Verified Skills and official plugin marketplaces reduce supply-chain risk; still review high-privilege skills.
4. **Never bypass Brakes** — third-party skills do not replace Spec Guardrails gates (`check-suppressions`, `validate-state`, …).

For publication-quality skill evaluation (overlap detection, live agent eval), see [SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator) — complementary to this package, not a replacement.

## Pre-Review Setup

- Verifier must have **clean context** (not the code author).
- Read `.specs/features/[feature]/spec.md` acceptance criteria.
- Identify attack surface: inputs, outputs, auth boundaries, data stores.

## OWASP-Oriented Checklist

### Injection
- [ ] SQL/NoSQL queries use parameterization or ORM safely
- [ ] Shell commands avoid unsanitized user input
- [ ] Template rendering escapes user content (XSS prevention)

### Broken Authentication
- [ ] Sessions/tokens expire appropriately
- [ ] Passwords hashed with modern algorithms (bcrypt, argon2)
- [ ] No credentials in URLs, logs, or client-side storage

### Sensitive Data Exposure
- [ ] Secrets in environment variables, not source code
- [ ] TLS for data in transit; encryption at rest where required
- [ ] PII minimized and masked in logs/responses

### Access Control
- [ ] Authorization checked on every protected endpoint
- [ ] IDOR prevented — users cannot access others' resources by ID manipulation
- [ ] Role/permission checks server-side, not client-only

### Security Misconfiguration
- [ ] Default credentials removed
- [ ] Error messages do not leak stack traces or internals in production
- [ ] CORS configured restrictively (not `*` with credentials)

### Vulnerable Components
- [ ] `npm audit` / equivalent run; critical/high addressed or documented
- [ ] No known-vulnerable dependencies without mitigation

### SSRF / External Requests
- [ ] URL fetchers validate allowed domains/schemes
- [ ] Internal network not reachable from user-controlled URLs

## Discrimination Sensor (Mutants)

Confirm tests catch intentional failures:

1. Remove or bypass an auth check → test must fail
2. Skip input validation → test must fail
3. Return wrong status code on error → test must fail

Inject mutants in an **isolated scratch copy** — a temp worktree or file copies. Never use `git stash` and never mutate the working tree. Discard the scratch afterwards and confirm `git status --porcelain` matches the pre-sensor baseline.

Document mutants tested in `.specs/features/[feature]/validation.md`.

## Evidence-or-Zero

Each security requirement from spec must have:
- Test file and line proving the control works
- Or explicit documented exception with owner approval

## Output

Write findings into the verifier's report at `.specs/features/[feature]/validation.md`, under the Security Review section defined in `references/validate.md`:

```markdown
## Security Review
- Reviewer: independent agent (clean context)
- Date: [ISO date]
- Mutants tested: [list]
- Findings: [pass/fail per checklist item]
- Evidence: [file:line references]
```

The completion gate reads this file:

```bash
python3 .specs/guardrails/scripts/validate_state.py .specs/features/[feature]
```

## Escalation

If critical vulnerability found:
1. Do not merge
2. Record the lesson with `lessons.py add --source` pointing at `validation.md`
3. Notify the project owner with severity and remediation steps

## Related Skills

- `agent-architecture.md` — SDD hub, execution contract, gates
- `references/validate.md` — verifier procedure and report schema
- `engineering-standards.md` — secure coding, commit format, artifact language
- `git-handoff.md` — git sync and session handoff for `.specs/`
- `task-graph-engineering.md` — verify node in diamond pattern
