# Releases — npm vs GitHub

How to find **what shipped** and where to read release notes.

## Source of truth

| Source | What it tracks |
| --- | --- |
| **[CHANGELOG](../CHANGELOG.md)** | Every version — features, fixes, limitations (**authoritative prose**) |
| **npm** `@luizsantiago/spec-guardrails` | Published packages consumers install (`npm view … version`) |
| **Git tags** `vX.Y.Z` | Git pointers at publish time |
| **GitHub → Releases** | Human-facing release pages (may lag npm for older 4.x lines) |

**Current stable (npm):** check with:

```bash
npm view @luizsantiago/spec-guardrails version
```

## Recent 4.x → 5.0 line (npm)

| Version | Theme | CHANGELOG |
| --- | --- | --- |
| **4.4.0** | Platform-aware `install` | [4.4.0](../CHANGELOG.md#440--platform-aware-install--hygiene) |
| **4.5.0** | README visuals + enforcement gaps | [4.5.0](../CHANGELOG.md#450--readme-visuals--enforcement-gaps) |
| **4.5.1** | Gate encoding fix, attribution | [4.5.1](../CHANGELOG.md#451--gate-encoding-fix--attribution) |
| **4.5.2** | Docs sync, config fixes | [4.5.2](../CHANGELOG.md#452--docs-sync-config-fixes-honest-readme) |
| **4.6.0** | Tutorials, `feature-overview` | [4.6.0](../CHANGELOG.md#460--tutorials-feature-dashboard-subagent-review) |
| **4.7.0** | Python platform pack | [4.7.0](../CHANGELOG.md#470--python-platform-pack-backend--devops--ai) |
| **4.8.0** | SDLC requirements + integration | [4.8.0](../CHANGELOG.md#480--sdlc-requirements--integration-helpers) |
| **5.0.0** | Operational loops CLI | [5.0.0](../CHANGELOG.md#500--operational-loops-cli--brownfield--converge-hints) |

Version picking: [Product history](Product-history.md). Upgrade steps: [Migration](Migration.md).

## GitHub Releases gap (4.3 → 4.7)

The GitHub **Releases** tab may still show **4.2.0** as “Latest” while npm already ships **5.0.0**. That is a **documentation/UI lag**, not missing npm packages.

- **Consumers:** use npm + CHANGELOG — not the Releases page alone.
- **Maintainers:** when publishing via Actions, consider `gh release create vX.Y.Z --notes-file …` from the matching CHANGELOG section so GitHub catches up.

## After upgrading

```bash
npx @luizsantiago/spec-guardrails@latest install
npx @luizsantiago/spec-guardrails doctor
```

Pin exact versions in CI and `package.json` when you need freeze — see [Product history → How to pin](Product-history.md#how-to-pin-a-version).
