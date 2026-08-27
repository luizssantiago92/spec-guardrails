# Contributing

Thanks for improving Spec Guardrails.

## Use the product to build the product

The most reliable way to contribute is to **run Spec Guardrails on your own change** — stable release for app projects, local CLI when hacking this repository.

### Your project or fork (stable npm)

```bash
npx @luizsantiago/spec-guardrails@latest install
npx @luizsantiago/spec-guardrails doctor
```

In agent chat: `/specify` → `/tasks` → `/loop` → `/verify`. Keep artifacts in `.specs/` as the source of truth for what you built and how you proved it.

### This source repository (local CLI)

Do **not** use `npx @luizsantiago/spec-guardrails install` here — it can resolve to the local package name incorrectly. Use:

```bash
npm install
npm run guardrails -- install
npm run guardrails -- doctor
```

After editing `skills/`, `scripts/`, or gates, re-run `npm run guardrails -- install` before dogfooding. Run `npm test` before opening a PR.

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

See **Use the product to build the product** above for install and dogfood commands. Consumer projects use `npx @luizsantiago/spec-guardrails install` in their own repo root.
