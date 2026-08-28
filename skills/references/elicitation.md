# Elicitation

Structured requirements discovery **before** `/specify`. Reads kickoff briefs, the local repo, and owner answers — then writes a **requirements brief** the Specify phase formalizes into `spec.md`.

Chat command: **`/elicit`**. CLI scaffold: `req-analysis init`.

## When to Use

**Project mode** (`--scope project`):

- After `install`, when a kickoff brief exists (file or pasted into chat)
- Brownfield after `project-init` — enrich PROJECT + ROADMAP before first feature
- Owner asks to "analyze the project" or "read my PRD and ask questions"

**Feature mode** (`--scope feature`):

- A specific delivery is named but details are missing ("add a settings page", "improve login")
- A ROADMAP candidate needs detail before `/specify`
- `/specify` would otherwise need many `[NEEDS CLARIFICATION]` markers

**Suggest, never block.** If the owner prefers `/specify` directly, proceed — Elicitation is optional.

## When NOT to Use

- **Quick tier** — use `quick-mode.md`
- **Explore** — owner still choosing *what* to build (options A/B/C), not *how*
- **Spec-ready request** — testable goal, clear scope → `/specify` directly
- **Discuss** — gray irreversible decision *inside* an existing spec draft → `discuss.md`

## Phase boundaries (do not repeat other phases)

| Phase | Asks about | Output |
| --- | --- | --- |
| **Explore** | What to build — alternatives | none |
| **Elicit (project)** | Gaps in kickoff + macro scope | `.specs/project/requirements-brief.md` |
| **Elicit (feature)** | Gaps for one delivery | `.specs/project/feature-briefs/[slug]/requirements-brief.md` |
| **Specify** | Formal REQ/EARS — minimal questions | `spec.md` |
| **Discuss** | Irreversible gray areas mid-spec | `context.md` |

Before each question: **cite the source** — "kickoff §Goal already says X — confirm?" or "not found — A) … B) …".

## Inputs

- Kickoff brief — any of:
  - `.specs/project/kickoff.md` (pasted chat or saved export)
  - `prd.md`, `docs/brief.md`, `docs/prd.md` (discovered automatically)
  - Owner paste in chat → persist to `.specs/project/kickoff.md` on first turn
- `.specs/project/PROJECT.md`, `ROADMAP.md` when present
- Relevant code (`code-index search`, targeted reads) for brownfield
- `memory-retrieve` after `memory-index rebuild` for prior briefs
- `context-limits.md` — one scope at a time

**Not in v1:** dedicated GitHub or ChatPRD CLI. If the owner has external docs, they paste export or point to a local path.

## Output

| Scope | Primary artifact | Also updates |
| --- | --- | --- |
| **project** | `.specs/project/requirements-brief.md` | ROADMAP feature candidates (suggested slugs) |
| **feature** | `.specs/project/feature-briefs/[slug]/requirements-brief.md` | — |

Optional scaffold:

```bash
npx @luizsantiago/spec-guardrails req-analysis init "description" --scope project
npx @luizsantiago/spec-guardrails req-analysis init "settings page" --scope feature
```

## Procedure

### 0. Choose scope

| Signal | Scope |
| --- | --- |
| First project pass, kickoff/PRD present, no project brief yet | **project** |
| Named feature, vague details, or ROADMAP item | **feature** |
| Owner unsure | Ask once; default **feature** for a single ask, **project** for greenfield kickoff |

Run `req-analysis init` when templates help; otherwise create the brief path directly.

### 1. Gather context (read-only)

1. List **Context sources** — every file read (paths + section if partial).
2. Run `req-analysis discover` (or read kickoff paths manually): `prd.md`, `docs/brief.md`, `.specs/project/kickoff.md`.
3. Skim PROJECT.md, ROADMAP, brownfield code if relevant.
4. `code-index search "<keywords>"` when the repo already has code.
5. `memory-retrieve "<topic>"` when memory index exists.

Summarize **Current state** in the brief — do not copy entire kickoff verbatim.

### 2. Gap analysis

List gaps only — requirements the kickoff + repo **do not** answer:

- UI: screens, buttons, actions, empty/loading/error
- API: endpoints, auth, errors
- Data: entities, retention
- Scope: in / out for this pass

Mark covered items: `covered by kickoff.md §…` — **do not ask again**.

### 3. Elicitation rounds

| Rule | Value |
| --- | --- |
| Max questions per round | **5** |
| Format | Concrete options A/B/C + recommendation (same as `discuss.md`) |
| One area per round | UI **or** API **or** data — not all at once |
| Stop when | Gaps closed, owner says "enough", or Open questions is `- none` |

**Cursor IDE hooks (optional, once per project — first elicitation round only):**

If the platform is **Cursor** and `.cursor/hooks.json` has no shipped Spec Guardrails entries yet, ask **once**:

> "Cursor can run automatic scope checks before file edits and screen shell commands. This is **off by default** (lighter on modest machines). Enable Cursor hooks for this project? A) Yes — run `install --with-cursor-hooks` B) No — keep off (recommended on low-RAM machines) C) Decide later"

- **Yes** → `npx @luizsantiago/spec-guardrails install --with-cursor-hooks` (sets `cursor.hooks: true` in config when present).
- **No** → note in brief or STATE; do not install hooks.
- **Later** → skip; owner can say "enable Cursor hooks" or "disable Cursor hooks" in chat anytime.

Never block Elicitation or Specify on this question.

Templates by detected type (ask only relevant dimensions):

- **UI** — layout, primary actions, navigation, states
- **API** — contract, auth, errors, idempotency
- **Data** — entities, migrations, retention
- **CLI/infra** — flags, envs, rollback

No production code. No `spec.md` until `/specify`.

### 4. Write the brief

Use the template from `req-analysis init`. Required sections:

- **Goal** — one sentence
- **Context sources**
- **Current state**
- **Capabilities** — product language, not EARS
- **Interaction details** — when UI/API applies
- **Constraints & out of scope**
- **Resolved questions** — D-001 format (from `discuss.md`)
- **Open questions** — `- none` when done
- **Feature candidates** (project mode) — suggested NNN-slug + one-line goal
- **Owner approval** — date + explicit yes

### 5. Owner approval

Present the brief summary. Wait for explicit approval before `/specify`.

**Gate before `/specify` (Brakes mode):**

```bash
npx @luizsantiago/spec-guardrails req-analysis validate
# or: validate-req-analysis .specs/project/requirements-brief.md
```

**Checklist (Process mode — agent verifies when Python is unavailable):**
- [ ] Open questions is `- none` or empty
- [ ] Owner approval filled
- [ ] Context sources lists at least one input
- [ ] No `[NEEDS CLARIFICATION]` or `[OPEN QUESTION]` left

### 6. Transition

**Project mode:**

1. Update ROADMAP with feature candidates (stubs — no spec.md yet).
2. Owner picks next feature → **feature mode** if still vague, else `/specify`.

**Feature mode:**

```bash
npx @luizsantiago/spec-guardrails feature-init "owner description"
```

Copy or link brief → `.specs/features/NNN-slug/requirements-brief.md` (optional).

Open `specify.md` — derive `spec.md` from brief; do **not** re-ask resolved questions.

Optional context bundle for Specify:

```bash
npx @luizsantiago/spec-guardrails req-analysis context --scope feature --slug settings-page
```

```bash
npx @luizsantiago/spec-guardrails req-analysis promote --scope feature
```

Prints promote steps when unsure.

## Router (hub — suggest only)

When the owner message is vague (interface without flow, "improve X" without criteria, kickoff exists but no `requirements-brief.md`):

> Suggest: "Want `/elicit` (a few targeted questions) or go straight to `/specify`?"

Never refuse `/specify`. Never run Elicitation without owner consent when they chose Specify.

## Rules

- English artifacts (see `engineering-standards.md`).
- Complement kickoff — do not rewrite or replace the owner's product brief.
- Lazy artifacts — create brief only when Elicitation runs.
- Re-run `memory-index rebuild` after approving a project brief so kickoff + brief are searchable.

## Anti-Patterns

| Avoid | Prefer |
| --- | --- |
| 80 generic questions | ≤5 per round until gaps close |
| Re-asking kickoff content | Cite source + confirm |
| Writing spec.md here | Brief in product language; Specify formalizes |
| Duplicating Discuss | Irreversible grays wait for Discuss inside Specify |

## Next

- Brief approved, feature chosen → `specify.md`
- Still choosing what to build → `explore.md`
- Back → `agent-architecture.md`
