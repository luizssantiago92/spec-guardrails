# Spec Guardrails — Architecture and Governance Audit

**Status:** analysis only (no structural product changes in this revision)  
**Scope:** Spec Guardrails core (`@luizsantiago/spec-guardrails` 5.0.x) plus two **public** consumer demos that already run the kit  
**Not in scope:** private repos; frontends without `.specs/`; new observability products

---

## 1. Executive summary

**What Spec Guardrails is today:** a **repo-native governance harness** for AI coding agents. It installs phase skills, durable `.specs/` memory, optional Python structural gates (**Brakes**), and human approval boundaries for specs, tasks, and git. It is **not** an IDE, not an autonomous agent runtime, and not a live APM / LLM-ops platform.

**What it is not:** “a thicker Spec Kit” alone, nor a guarantee that tests semantically prove each REQ. Gates check **artifact structure and traceability paperwork**; humans still judge product quality.

**Corrected premises (vs common overstatements):**

| Claim often heard | Accurate model |
| --- | --- |
| `prd.md` is a control plane | Optional **kickoff input** for `/elicit` / `req-analysis discover` — not a mandatory phase |
| One rigid PRD → feature cascade | Progressive delimitation: kickoff → (optional brief) → **approved `spec.md`** → **approved `tasks.md`** → execute → verify → archive |
| Everything is hard-enforced | **Process** (Node + skills) vs **Brakes** (Python exit codes); several capabilities stay **opt-in / off by default** |
| Spec approval authorizes ship | Spec/tasks approval = **Tier 0 local** only; push/PR/merge/deploy need explicit owner go-ahead |

**Hypothesis under test:** across different application stacks, what stays constant is the **agent governance process**, not the software architecture. The two public demos below support that hypothesis qualitatively.

---

## 2. Governance model

```text
Human intent / authorization
        ↓
Spec Guardrails (repo-local)
  ├── Kickoff context (optional prd.md / brief / chat)
  ├── Complexity router (classify-change / hub)
  ├── Phase skills (one procedure per turn)
  ├── .specs/ state + feature artifacts
  ├── Brakes gates (optional Python)
  ├── Evidence + /verify
  └── Git tiers 0 / 1 / 2
        ↓
AI coding agent
        ↓
Repository (code + .specs/)
```

**Two enforcement modes (same phases):**

| Mode | Runtime | Who stops incomplete work |
| --- | --- | --- |
| **Process** | Node only | Agent honesty + skill checklists |
| **Brakes** | Node + Python 3.10+ | Gate scripts with non-zero exit = STOP |

`doctor` reports separate **Process** and **Brakes** readiness scores after install and upgrades.

**Primary control loops:**

1. **Feature loop** — `feature-init` → (elicit?) → specify → (discuss/design?) → tasks → analyze → `/loop` → `/verify` → `archive-feature`
2. **Quick lane** — ≤3 files, express path (skips full spec/tasks ceremony when appropriate)
3. **Operational loops (5.0+)** — `loop list|show|run` for recurring repo health (separate from feature delivery)

---

## 3. Authority boundaries

### What the agent may do alone (Tier 0 — local)

- Allocate a feature folder and local branch (`feature-init`)
- Draft / update `.specs/` artifacts (`spec.md`, `tasks.md`, design, STATE)
- Run gates locally; commit locally when skills allow Tier 0
- Implement within approved task file ownership during `/loop`
- Write `validation.md` in an **independent** verify pass (author ≠ verifier discipline)

### What the agent may propose but not assume

- Requirements briefs (`/elicit`)
- Spec and task content before human approval
- Design / discuss options
- Next feature after archive — must be newly authorized

### What needs human approval

| Action | Gate |
| --- | --- |
| Proceed past vague intent on Complex (when policy on) | Approved requirements brief |
| Start implementation of a full-path feature | **Approve `spec.md`** |
| Start `/loop` job list | **Approve `tasks.md`** |
| Treat verify FAIL as closed | Re-work + re-verify (lessons) |
| Share work | **Tier 1** — `git push`, open/update PR |
| Land / ship | **Tier 2** — merge, deploy, force-push, production data |

### Soft vs hard enforcement (honest gaps)

| Boundary | Hard (Brakes / CLI) | Soft (Process / skills) |
| --- | --- | --- |
| Spec/tasks shape & REQ→task→citation chain | Yes (`validate-spec`, `validate-tasks`, `validate-traceability`, …) | Checklist if no Python |
| Spec/tasks **approval** | Not a cryptographic lock — convention + skills | Agent must wait for owner |
| Stay inside task `Files` | Optional `context-guard` (off by default) | Skill discipline |
| Path/budget limits | Optional `execution-policy` (off by default) | Skill discipline |
| Destructive shell | Optional `sandbox` (off by default) | Skill discipline |
| No push without ask | No mandatory git interceptor | **git-handoff** + hub tiers |

**Escape risk (document, do not “fix” in this revision):** a non-compliant agent can still edit files or push if the human’s tool stack allows it. Spec Guardrails **raises the cost of silent autonomy**; it does not replace OS or forge ACLs.

---

## 4. PRD → Feature → Spec → Tasks model

### Accurate progressive delimitation

```text
Optional kickoff (prd.md | docs/brief.md | chat | .specs/project/kickoff.md)
        ↓
Optional /elicit → requirements brief → YOU approve (policy may require on Complex)
        ↓
/specify → spec.md → YOU approve
        ↓
Optional /discuss, /design (Medium+/Complex)
        ↓
/tasks → tasks.md → YOU approve
        ↓
/loop waves (+ gates) → commits (Tier 0)
        ↓
/verify → validation.md (independent proof)
        ↓
archive-feature → domain memory + ROADMAP; STATE reset
        ↓
YOU authorize Tier 1 / 2 as needed
```

**`prd.md` role:** discovered kickoff source (`req-analysis discover`), not an authorization object. Product PRDs under this repository’s `prd/` folder describe **Spec Guardrails itself**, not the consumer control plane.

**There is no formal “Version/Scope” artifact layer** in the kit. Scope narrowing happens via complexity routing, out-of-scope sections in specs, and human refusals — not a separate version controller.

---

## 5. Layer analysis (component matrix)

| Component | Function | Agent risk controlled | Mandatory? | Overlap | Keep? |
| --- | --- | --- | --- | --- | --- |
| Hub (`skills/agent-architecture.md`) | Phase map, router, git tiers | Loading whole playbook / improvisation | Yes (Process) | — | **Keep** |
| Phase references | One procedure per turn | Token blow-up; skipped steps | Yes (Process) | Sister skills | **Keep** |
| `/elicit` + `req-analysis` | Structured discovery | Wrong goal from vague chat | Optional (policy can require) | Kickoff files | **Keep** |
| `spec.md` + `validate-spec` | Written goal + shape gate | Fake/thin acceptance criteria | Full path yes | Brief | **Keep** |
| `tasks.md` + `validate-tasks` | Owned jobs + REQ coverage | Unscoped coding | Full path yes | Task graph | **Keep** |
| `/loop` + `loop-plan` | Wave execution | Big-bang PRs | Yes for execute | Workspaces | **Keep** |
| Python gates (Brakes) | Exit-code STOP | Agent “should stop” honesty | Optional install | Process checklists | **Keep** |
| `/verify` + `validation.md` | Independent proof | Author marking own work done | Yes | Traceability gate | **Keep** |
| `.specs/` + STATE + archive | Durable memory | Chat amnesia / handoff loss | Yes | Memory index (opt) | **Keep** |
| Git tiers 0/1/2 | Blast radius | Silent push/merge/deploy | Yes (Process) | Host ACLs | **Keep** |
| `feature-status` / `feature-overview` | Human-readable feature state | Invisible progress / missing evidence | Optional CLI | Gates | **Keep** (see §9) |
| `execution-policy` / `context-guard` / `sandbox` | Extra brakes | Scope/budget/shell abuse | Off by default | Skills | **Investigate** before default-on |
| Operational `loop` CLI | Repo health patterns | Mixing ops with feature work | Optional (5.0+) | Feature `/loop` | **Keep** |
| `python-platform` preset | Ship/AI surface docs | Infra/AI paths without contracts | Opt-in preset | Design gate | **Keep** |

---

## 6. Essential vs accidental complexity

### Essential (do not remove for “simplicity”)

- Written goal + task list + human approvals before build
- Traceability REQ → task → `file:line` citations at verify
- `.specs/` as source of truth across sessions
- Process vs Brakes distinction (honesty vs exit codes)
- Git tiers separating local work from share/ship
- Complexity router (Quick vs full ceremony)

### Accidental / review candidates (docs & UX — not gate removal)

- Readers may miss that **governance visibility** already exists (`feature-status` / `feature-overview`) because README lists them late under “More in the kit,” not as a named “see state” step
- “Observability” in python-platform docs means **runtime APM is out of scope** — easy to confuse with **governance state visibility**
- Optional capabilities (policy/guard/sandbox/memory embed) increase surface area while staying off — good for power users, easy to overlook in mental models
- Naming drift risk across chat phrases vs CLI (`/elicit` vs `req-analysis`, etc.) — already documented but still cognitive load

**Rule used here:** remove accidental friction; do **not** remove essential governance just to shrink file count.

---

## 7. Project evidence (public Spec Guardrails demos)

Only **public** repos that already exercise the kit and are useful as demos.

### [llm-router-gateway](https://github.com/luizssantiago92/llm-router-gateway)

| Signal | Observation |
| --- | --- |
| Stack | Python FastAPI LLM gateway (“zero-cost demo”) |
| Kit footprint | Full `.specs/` — `project/`, `features/001-llm-router-gateway/` (`spec`, `tasks`, `design`, `task-graph`, `validation`, **`overview`**), `domains/`, gate scripts, `prd.md` kickoff |
| Governance depth | End-to-end feature memory: 13/13 tasks, validation **PASS** with REQ→test citations, architecture decisions in STATE |
| Shows | Spec Guardrails can govern an **integration / LLM** codebase, not only CRUD apps |

### [gold-queen-api](https://github.com/luizssantiago92/gold-queen-api)

| Signal | Observation |
| --- | --- |
| Stack | FastAPI + PostgreSQL Open Finance / AI advisor; description cites Spec-Guardrails; public demo host |
| Kit footprint | `.specs/` with STATE, LESSONS, config, **full Brakes script tree**, GETTING_STARTED; root `PRD.md` + `AGENTS.md` |
| Governance depth | Install + agent onboarding present; **no feature folders in tree at audit time** (STATE shows no active feature) — harness ready / lighter artifact history than the gateway demo |
| Shows | Spec Guardrails installs cleanly on a **product API** repo; adoption of full feature ceremony can lag install |

### Explicitly excluded

| Repo | Reason |
| --- | --- |
| gold-queen-web | Public product demo but **no `.specs/`** — not evidence of kit usage |
| omni-extract | Private — outside public-demo criterion |

### Hypothesis result

**Supported with nuance:** both public demos share the **same governance substrate** (`.specs/`, gates, agent entrypoints) across different domains (LLM router vs finance API). Depth of feature artifacts varies — the gateway is a richer **completed-feature** exhibit; Gold Queen API is a stronger **installed harness + product** exhibit. Constancy is the **process**, not identical folder fullness.

---

## 8. Runtime vs development governance

| Layer | Spec Guardrails | Runtime AI guardrails (e.g. in-app advisors) |
| --- | --- | --- |
| When | While agents **write software** | While the **shipped product** calls models |
| Objects | Specs, tasks, STATE, gates, git | Schemas, tool allowlists, fallbacks, prompt policy |
| Proof | `validation.md` + tests cited in git | Request/response validation, eval harnesses |
| Example | This kit in `llm-router-gateway` | App-level validation inside Gold Queen / gateway adapters |

Do **not** market Spec Guardrails as runtime LLM safety. The python-platform pack documents Ship/AI **surfaces in git**; it explicitly is **not** live production tracing.

---

## 9. Governance visibility (existing tooling — recommendation only)

**Finding:** the kit already ships human-readable **feature state** commands:

- `feature-status` — artifact checklist + next step  
- `feature-overview` — REQ → task → evidence dashboard (`--write` → `overview.md`)  
- Plus `doctor`, `validate-*`, `validate-traceability`

They appear in the README cheat sheet and tutorials, and `llm-router-gateway` already has a generated `overview.md`. They are **not** branded as a first-class “see governance state” beat in the hero/onboarding path.

**Recommendation (Improve — docs only unless later approved):** in README / Overview, add one short beat that **`feature-status` / `feature-overview` are how humans inspect feature governance state** — distinct from runtime observability. **Do not** invent a parallel product in this kit for that job.

No implementation in this audit revision.

---

## 10. Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Process mode mistaken for hard enforcement | Medium | Mitigate with clearer Process vs Brakes messaging |
| Soft approval / git tiers bypassed by a non-compliant agent | Medium | Inherent to skill-based governance; host ACLs still required |
| Install without feature ceremony (Gold Queen API pattern) | Low–Med | Harness present but benefits unrealized until `/specify`…`/verify` runs |
| Optional guards unused | Low | Correct default; document when to turn on |
| Confusing “observability” vocabulary | Low | Separate governance visibility vs APM in docs |
| Semantic gap (gates ≠ proof tests match REQs) | Medium | Already honest in Gates-and-guarantees — keep saying it |

---

## 11. Recommendations

| Class | Item |
| --- | --- |
| **Keep** | Hub + phases, approvals, `.specs/` memory, Brakes gates, git tiers, complexity router, verify independence |
| **Improve** | Explicit Process vs Brakes callout early in README/Overview; one-line “inspect state with `feature-status` / `feature-overview`” |
| **Simplify** | Only accidental doc/link/naming friction — **not** gate count |
| **Investigate** | Why some installs stay at scaffold without feature artifacts; whether opt-in guards should be suggested by `doctor` when Tier-0 abuse patterns appear |
| **Do not touch yet** | Gate contracts, approval model, memory layout, default-off optional enforcement |

---

## 12. Proposed next phase (maturity — not feature sprawl)

1. **Docs clarity PR** (small): Process vs Brakes + governance-state commands in onboarding.  
2. **Demo narrative** (optional): point README/docs at the two public demos as “kit in the wild” without claiming statistical proof.  
3. **Adoption check**: after install, `doctor` / tutorial nudge toward first `feature-status` once a feature exists.  
4. **Defer** new enforcement defaults and any separate observability product until the above messaging is crisp.

---

## 13. Top 5 changes (if any) — decide later

| # | Change | Why | Implement now? |
| --- | --- | --- | --- |
| 1 | Clarify Process vs Brakes in onboarding | Stops false sense of hard enforcement | Docs-only; **recommended** |
| 2 | Name `feature-status` / `feature-overview` as governance-state view | Capability exists but under-signaled | Docs-only; **recommended if useful** |
| 3 | Link public demos as qualitative evidence | Strengthens “stack-agnostic process” story | Docs-only; optional |
| 4 | `doctor` hints for unused optional guards | Closes soft escapes without default-on | **Investigate** first |
| 5 | Remove or merge gates for “simplicity” | Would weaken essential governance | **Do not** |

---

## Closing principle

> Spec Guardrails does not exist to make the agent smarter. It exists to make the agent’s ability to act **more controllable, traceable, and predictable**.

For every mechanism: prefer **“does this improve control given its complexity cost?”** over **“does this make the system look simpler?”**
