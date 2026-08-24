# Memory and search — simple guide

Spec Guardrails memory is **not** a magic brain that remembers every file in your repo. It is **structured project notes** plus an **optional search index** on top of those notes.

---

## Two layers (remember this)

```text
.specs/*.md  ←  SOURCE OF TRUTH (you and the agent write here)
      │
      │  memory-index rebuild
      ▼
memory.db    ←  SEARCH INDEX (disposable — rebuild anytime)
```

If the index is wrong or missing, run `memory-index rebuild`. Your markdown files are safe.

---

## What counts as “memory”

| Artifact | What it stores |
| --- | --- |
| `STATE.md` | Active feature, phase, next step, decisions |
| `features/…/spec.md` | What must be built |
| `features/…/tasks.md` | How to build it in steps |
| `features/…/validation.md` | Proof it was verified |
| `features/…/design.md` | Technical design (when used) |
| `features/…/exploration.md` | Compared design candidates (if used) |
| `lessons.json` | Rules learned from past FAILs |
| `project/PROJECT.md`, `ROADMAP.md` | Long-lived context |

**Chat logs are not memory.** Only what you persist in `.specs/` counts.

---

## Three search commands (escalation ladder)

Use the **simplest tool that works**:

### 1. `memory-query --from T1`

**When:** You already know an id (task, requirement, feature).

**Question it answers:** “What is connected to this node in the graph?”

```bash
npx @luizsantiago/spec-guardrails memory-query --from T1 --depth 2
```

### 2. `memory-search "keywords"`

**When:** You remember **words** that appear in specs or validation.

**Question it answers:** “Where did we write about OAuth / timeout / REQ-003?”

```bash
npx @luizsantiago/spec-guardrails memory-search "session timeout"
```

### 3. `memory-retrieve "natural language question"`

**When:** You want a **ranked package** — keywords + related entities.

**Question it answers:** “What do we already know about silent logout failures?”

```bash
npx @luizsantiago/spec-guardrails memory-retrieve "silent logout failures" --mode hybrid
```

The agent usually runs these during long features — you do not need them on every task.

---

## When to run `memory-index rebuild`

| Do rebuild | Skip rebuild |
| --- | --- |
| Changed spec, tasks, design, validation, exploration | Only edited `src/` code |
| Added or updated approved lessons | Only changed `STATE.md` next step |
| Before search and index feels stale | Tiny typo fix in one task checkbox |
| `doctor` prints a **Memory hint** | Index is fresh and search works |

```bash
npx @luizsantiago/spec-guardrails memory-index rebuild
```

**Embeddings:** rebuild keeps embeddings for chunks whose text did not change. Run `embed` again only for new or edited chunks when semantic is on.

---

## Semantic search (optional)

**Default: OFF.** You do not need it to use Spec Guardrails.

| | Without semantic | With semantic |
| --- | --- | --- |
| **Finds** | Exact / stemmed words + graph | Similar **meaning**, different words |
| **Needs** | Python only | OpenAI **or** Ollama + config |
| **Cost** | Free | API or local GPU/CPU |
| **Best when** | Small repo, clear specs | Large `.specs/` history, vocabulary drift |

### When to consider turning it on

- FTS/search failed **several times** with different wordings
- Many archived features + validations + lessons
- Team asks “have we seen this **kind** of problem before?” often

### When to keep it off

- New project, few features
- You know ids or exact terms (`memory-query` / `memory-search` enough)
- No OpenAI key and no Ollama

### How to enable (summary)

1. In `.specs/config.yaml`:

```yaml
memory:
  retrieval:
    semantic: true
    provider: openai   # or ollama
    model: text-embedding-3-small
```

2. Set `OPENAI_API_KEY` or run Ollama locally.

3. Rebuild and embed:

```bash
npx @luizsantiago/spec-guardrails memory-index rebuild
npx @luizsantiago/spec-guardrails memory-index embed
```

4. Search:

```bash
npx @luizsantiago/spec-guardrails memory-retrieve "your question" --mode hybrid
```

After rebuild, unchanged chunks keep their embeddings — run `embed` when `doctor` suggests it or after large `.specs/` edits.

---

## Episodic memory lifecycle

Between chat sessions and formal lessons, use **episodes** for short-lived context:

```text
working   →  episodic  →  promoted (→ lessons when grounded)
   │              │
 record         archive        promote
                  │
                prune (after retention_days)
```

| Command | When |
| --- | --- |
| `episodes record --summary "…"` | End of session — capture what happened |
| `episodes archive EP-001` | Move working → episodic |
| `episodes prune` | Drop old episodic entries (default 90 days) |
| `episodes promote EP-001 --rule "…"` | Mark for lesson graduation |
| `memory-index rebuild` | Index episodic/promoted episodes for search |

Config: `memory.lifecycle.retention_days` in `.specs/config.yaml`.

---

## Does `doctor` tell me to use memory?

**Partially (since 3.7.0).** `doctor` may print a **Memory hint** when:

- artifacts exist but `memory.db` is missing
- `.specs/` changed since the last rebuild
- semantic is enabled but most chunks lack embeddings

It does **not** turn semantic on/off for you — you still choose that in config. See [FAQ → doctor and memory](FAQ.md#does-doctor-tell-me-when-to-use-memory-or-semantic-search).

---

## Team tips (Cursor)

1. Write good **specs and validation** — search quality follows artifact quality.
2. Rebuild after merges that touch `.specs/` on main.
3. Start with **`memory-retrieve --mode fts`** before enabling semantic.
4. Semantic does **not** prevent coding errors — it helps **find past context**.

---

## Related docs

- [Overview → Memory section](Overview.md#memory-and-search)
- [Agent commands → memory rows](agent-commands.md)
- Installed skill: `references/memory.md`

Back to [Home](Home.md)
