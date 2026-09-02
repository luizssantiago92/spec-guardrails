# Brownfield context: KG and RepoGraph

Why we **defer** full knowledge-graph (KG) and RepoGraph integrations as brownfield power-ups — and what we use instead today.

## What brownfield needs

When `project-init` scans an existing repo, the agent needs:

1. **Where things live** — stacks, roots, domain folders
2. **What is true** — requirements, APIs, invariants (`.specs/domains/`)
3. **What depends on what** — for safe parallel work and impact analysis

KG and RepoGraph attack (2) and (3) with graphs. Spec Guardrails already covers a lighter slice via markdown + gates.

## Knowledge graphs (graph-engineering KG half)

[graph-engineering](https://github.com/codejunkie99/graph-engineering) describes a **9-stage pipeline**: scope → ontology → extract entities/relations → quality → fusion → serve to LLMs.

### Problems for this package

| Challenge | Why it hurts |
| --- | --- |
| **Schema before value** | KG without ontology drifts; ontology without owner becomes stale on first refactor |
| **Extraction cost** | Entity/relation extraction over a whole repo is slow, noisy, and model-dependent |
| **Fusion & provenance** | Conflicting triples need human rules; wrong fusion poisons every downstream agent turn |
| **Serving surface** | GraphRAG needs infra (store, query API, refresh on every commit) — outside npm install scope |
| **Overlap with `.specs/`** | Domains + archive already hold *curated* truth; auto-KG duplicates and disagrees |

### What we do instead

- `project-init` → `PROJECT.md` + optional domain stubs; **`code-index rebuild` runs by default** (5.0+) unless `--no-code-index`
- `archive-feature` → merge verified specs into `.specs/domains/`
- **`code-index rebuild`** → lightweight `.specs/memory/code-index.json` (files, symbols, imports) — shipped in **3.9.0**; brownfield onboarding triggers it automatically since **5.0.0**
- Manual **REQ → file → test** links in specs and validation (gate-enforced)

A future **optional plugin** could still add full RepoGraph or a triple-store KG — the core package stops at the markdown + shallow index middle ground.

## RepoGraph

[RepoGraph](https://github.com/ozyyshr/RepoGraph) builds a **repository-level code graph** (def/ref relations) and plugs into SWE-bench agents via `search_repo()`.

### Problems for this package

| Challenge | Why it hurts |
| --- | --- |
| **Build time** | Authors note full-graph construction is slow; they ship pre-built caches per benchmark instance |
| **Python + NetworkX weight** | Heavy dependency chain for a Node-first installer |
| **Stale graphs** | Graph invalidates on every edit unless incremental rebuild exists |
| **Agent action surface** | Needs a stable tool contract (`search_repo`) wired into Cursor/Claude — not just files on disk |
| **Scope creep** | Solves *navigation*, not *agreement* — spec/gates still required |

### What we do instead

- `detectProjectStack` / `detectDomainCandidates` in `project-init` (shallow structure)
- Agent uses normal repo search + `PROJECT.md` hints
- Task graphs for **planned** work, not automatic code graphs

## When to revisit

Consider RepoGraph or KG only if:

- Brownfield repos routinely exceed what `PROJECT.md` + domains capture
- You ship a **separate optional plugin** (not core install) with cache + refresh policy
- You have evals proving graph context reduces verify failures without increasing false edits

## Credits

- [graph-engineering](https://github.com/codejunkie99/graph-engineering) (MIT) — KG pipeline and task-graph theory
- [npubird/KnowledgeGraphCourse](https://github.com/npubird/KnowledgeGraphCourse) — original SEU course (graph-engineering distillation source)
- [RepoGraph](https://github.com/ozyyshr/RepoGraph) — repository-level code graph research (SWE-bench integration)
