# Platform adapters — shipped entry points

Spec Guardrails is **not limited to one AI product**. This page lists **shipped adapters**. The [Architecture](Architecture.md) core works with any agent that can read repo files and run shell commands.

## What install writes

| Asset | Cursor | Claude Code | GitHub Copilot | OpenAI Codex |
| --- | --- | --- | --- | --- |
| Sister skills | `.cursor/skills/*.md` | `.claude/skills/*.md` | `.github/skills/*.md` | `.codex/skills/*.md` |
| Phase references | `.cursor/skills/references/` | `.claude/skills/references/` | `.github/skills/references/` | `.codex/skills/references/` |
| Gate scripts | `.specs/guardrails/scripts/` (shared) | same | same | same |
| Project memory | `.specs/` (shared) | same | same | same |
| Always-on contract | `.cursorrules` + `.cursor/rules/engineering-baseline.mdc` | `.claude/CLAUDE.md` | `.github/copilot-instructions.md` | `.codex/AGENTS.md` |
| Open standard | — | — | — | root `AGENTS.md` (also for other agents) |

Re-run `npx @luizsantiago/spec-guardrails install` to refresh skills and managed blocks. User prose outside Spec Guardrails markers is kept.

## Same loop

| Step | All adapters |
| --- | --- |
| Specify | Hub + `references/specify.md` |
| Tasks / Execute | `tasks.md` / `implement.md` + gates |
| Verify | Fresh context + `validate.md` + sisters |
| Quick | `references/quick-mode.md` + `validate-quick` |

CLI helpers that work in any shell: `doctor`, `classify-change`, `feature-status`, `feature-init`, gate commands.

## Differences (intentional)

| Topic | Note |
| --- | --- |
| Rule format | Cursor uses `.mdc` always-apply rules; Claude uses `CLAUDE.md`; Copilot uses repo instructions; Codex uses `AGENTS.md` |
| Skill discovery | Each product loads from its own skills directory — install copies the same markdown into each tree |
| Chat commands | `/specify`, `/loop`, `/verify` are **chat** conventions — not shell binaries |

## Operating modes

| Mode | All adapters |
| --- | --- |
| **Process** | Node only — workflow + `.specs/` + progressive loading |
| **Brakes** | Node + Python — structural gates exit non-zero |

See [Guarantees matrix](Guarantees-matrix.md) for which promises require Brakes.

## Check after install

```bash
npx @luizsantiago/spec-guardrails doctor
```

Doctor shows separate **Process** and **Brakes** scores. Missing Python keeps you in Process mode (manual checklists from `references/`).

## Related

- [Architecture](Architecture.md) — Core vs adapters
- [Guarantees matrix](Guarantees-matrix.md) — product promises
- [Skills and hub](skills-and-hub.md)
- [Quick start](Quick-start.md)
- [Migration](Migration.md)
