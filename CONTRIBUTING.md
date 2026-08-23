# Contributing

Thanks for improving the Spec Guardrails.

## Basics

- Keep artifacts in English (code, tests, commits, `.specs/`).
- Prefer small, focused diffs.
- Run `npm test` before opening a PR.

## Gate stability (0.7.x)

Structural gates follow the freeze line documented in [Gates and guarantees](docs/guide/Gates-and-guarantees.md) and ADR 0001 (gate contract lineage — not the old package 0.7.x label):

If you believe a gate false-passes:

1. Add a failing case to [`test/test_adversarial_gates.py`](test/test_adversarial_gates.py) first.
2. Confirm `npm test` fails on that case alone.
3. Fix the gate or docs; keep the case green thereafter.

Free-form audits without a matrix fixture do not open gate PRs.

## Layout

| Path | Role |
| --- | --- |
| `skills/` | Hub + sister skills |
| `skills/references/` | Phase procedures |
| `scripts/` | Deterministic Python gates |
| `rules/` | Cursor project rules |
| `test/` | Node install tests + Python gate / adversarial suites |

## Local checks

```bash
npm install
npm test
```

When developing **inside this source repository**, do **not** run `npx @luizsantiago/spec-guardrails install` — `npx` can resolve to the local package name and fail. Use the local CLI entrypoint instead:

```bash
npm install
npm run guardrails -- install   # only when testing the installer itself
npm run guardrails -- --help
npm run guardrails -- doctor
```

Consumers install in **their own** project with `npx @luizsantiago/spec-guardrails install`.
