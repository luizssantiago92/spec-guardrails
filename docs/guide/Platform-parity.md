# Platform parity — adapters today

Spec Guardrails is **agent-agnostic at the core** — see [Architecture](Architecture.md). **Adapters** are where skills and always-on rules land for each product.

Today install ships two adapters: **Cursor** and **Claude Code**. The same hub, phase references, Python gates, and `.specs/` memory apply to both; only entry paths differ.

## What install writes

| Asset | Cursor | Claude Code |
| --- | --- | --- |
| Sister skills | `.cursor/skills/*.md` | `.claude/skills/*.md` |
| Phase references | `.cursor/skills/references/` | `.claude/skills/references/` |
| Gate scripts | `.specs/guardrails/scripts/` (shared) | same |
| Project memory | `.specs/` (shared) | same |
| Always-on contract | `.cursorrules` + `.cursor/rules/engineering-baseline.mdc` | `.claude/CLAUDE.md` |

Re-run `npx @luizsantiago/spec-guardrails install` to refresh skills and managed blocks. User prose outside Spec Guardrails markers is kept.

## Same loop

| Step | Both agents |
| --- | --- |
| Specify | Hub + `references/specify.md` |
| Tasks / Execute | `tasks.md` / `implement.md` + gates |
| Verify | Fresh context + `validate.md` + sisters |
| Quick | `references/quick-mode.md` + `validate-quick` |

CLI helpers that work in either shell: `doctor`, `classify-change`, `feature-status`, `feature-init`, gate commands.

## Differences (intentional)

| Topic | Note |
| --- | --- |
| Rule format | Cursor uses `.mdc` always-apply rules; Claude uses `CLAUDE.md` |
| Skill discovery | Each product loads from its own skills directory |
| Chat commands | `/specify`, `/loop`, `/verify` are **chat** conventions — not shell binaries |

Future adapters (Codex, GitHub Copilot instructions, etc.) would add new paths without changing the core — listed as *planned* in [Architecture](Architecture.md), not shipped yet.

## Operating modes

| Mode | Both adapters |
| --- | --- |
| **Process** | Node only — workflow + `.specs/` + progressive loading |
| **Brakes** | Node + Python — structural gates exit non-zero |

See [Guarantees matrix](Guarantees-matrix.md) for which promises require Brakes.

## Check after install

```bash
npx @luizsantiago/spec-guardrails doctor
```

Expect skills under both trees when you use both agents in the same repo. Missing Python shows the doctor banner — you stay in **Process mode** (manual checklists from `references/`).

## Related

- [Architecture](Architecture.md) — Core vs adapters
- [Guarantees matrix](Guarantees-matrix.md) — product promises
- [Skills and hub](skills-and-hub.md)
- [Quick start](Quick-start.md)
- [Migration](Migration.md)
