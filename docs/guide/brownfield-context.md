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

## Optional: Graphify

[Graphify](https://github.com/Graphify-Labs/graphify) builds a **queryable knowledge graph** from code, docs, PDFs, and images (AST + LLM), and can export an **agent-crawlable wiki** (`--wiki` → `index.md` per community). It is a mature optional tool in the same *navigation* space as RepoGraph — **not** part of Spec Guardrails install.

### When `code-index` is enough

- Small/medium repos where `PROJECT.md` + domains + `code-index search` answer “where is X?”
- You want deterministic, zero-LLM brownfield hints only
- You must keep install surface Node + optional Python gates

### When Graphify helps

- Large or multi-domain repos where agents re-read the same trees every session
- Mixed corpus (code + long docs + papers/diagrams) that a shallow symbol map cannot connect
- You want a persistent wiki/`GRAPH_REPORT.md` the agent can navigate by reading files

### How to use alongside Spec Guardrails

1. Keep Spec Guardrails for **agreement** (specs, tasks, gates, archive).
2. Install Graphify separately (`pip install graphifyy` / skill install — see upstream README).
3. Point the agent at `graphify-out/wiki/index.md` (or re-run `/graphify . --wiki` / `--update`) for navigation — do **not** treat auto-extracted edges as domain truth.
4. `doctor` may report an optional `graphify-available` check; missing Graphify does **not** lower the readiness score.

Do **not** replace `code-index`, wire Graphify into Python gates, or auto-install it from `npx @luizsantiago/spec-guardrails install`.

## When to revisit

Consider RepoGraph, Graphify-as-plugin, or a full KG only if:

- Brownfield repos routinely exceed what `PROJECT.md` + domains + `code-index` capture
- You ship a **separate optional plugin** (not core install) with cache + refresh policy
- You have evals proving graph/wiki context reduces verify failures without increasing false edits

## Credits

- [graph-engineering](https://github.com/codejunkie99/graph-engineering) (MIT) — KG pipeline and task-graph theory
- [npubird/KnowledgeGraphCourse](https://github.com/npubird/KnowledgeGraphCourse) — original SEU course (graph-engineering distillation source)
- [RepoGraph](https://github.com/ozyyshr/RepoGraph) — repository-level code graph research (SWE-bench integration)
- [Graphify](https://github.com/Graphify-Labs/graphify) — optional multimodal graph + agent wiki (not vendored)
