# Tutorials

Hands-on paths from zero to parallel Execute. Each tutorial is self-contained; do them in order if you are new to Spec Guardrails.

| Tutorial | Time | You learn |
| --- | --- | --- |
| [01 — Quick fix](01-quick-fix.md) | ~20 min | Express lane: classify → implement → `validate-quick` |
| [02 — Medium feature](02-medium-feature.md) | ~45 min | Spec approval → tasks → loop → independent `/verify` |
| [03 — Parallel worktrees](03-parallel-worktrees.md) | ~60 min | `task-graph.md`, `workspace-prepare`, two-stage batch review |

Before you start: [Quick start](../Quick-start.md) · [How it works](../How-it-works.md) · `npx @luizsantiago/spec-guardrails doctor`

## After each tutorial

```bash
npx @luizsantiago/spec-guardrails feature-overview <feature> --write
npx @luizsantiago/spec-guardrails feature-status <feature>
```

`overview.md` is a human-readable dashboard (REQ → task → evidence) — inspired by spec workspace UIs, but stored as markdown in your repo.

## External learning material

- [GitHub Spec Kit tutorials](https://github.com/kkawailab/speckit-tutorial) — progressive Spec Kit walkthroughs (ToDo → API → microservices). Different CLI, similar SDD mindset.
- [Agent Skills standard](https://agentskills.io) — how Anthropic and Google structure portable `SKILL.md` files. Spec Guardrails skills follow the same frontmatter pattern.
