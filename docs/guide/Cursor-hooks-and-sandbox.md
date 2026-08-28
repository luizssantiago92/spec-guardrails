# Cursor hooks and sandbox policy

Optional **Cursor-only** automation: scope check before file edits and shell-command policy before the agent runs terminal commands. **Off by default** — enable only when you want the extra safety net and your machine can handle the extra Node processes.

---

## Default: hooks are not installed

`install` **does not** register Cursor hooks unless you opt in:

```bash
npx @luizsantiago/spec-guardrails install --with-cursor-hooks
```

Or set in `.specs/config.yaml`:

```yaml
cursor:
  hooks: true
```

Then re-run `install` (or run with `--with-cursor-hooks` once).

**Disable again:**

```bash
npx @luizsantiago/spec-guardrails install --without-cursor-hooks
```

During **`/elicit`**, the agent may ask once (Cursor only) whether to enable hooks. You can also say **"enable Cursor hooks"** or **"disable Cursor hooks"** in chat anytime — the agent runs the matching `install` flag above.

> **Performance:** When enabled, hooks spawn a new Node process on every file edit and shell command. If Cursor or `node.exe` feels heavy — common on Windows — keep hooks off or use `SPEC_GUARDRAILS_CLI` (see [Performance](#performance-especially-windows)). The core Spec Guardrails loop does not require hooks.

**Cursor only.** Other adapters use the same CLI helpers when the agent calls them; only Cursor can auto-run these hooks.

---

## What you might notice (when enabled)

| Symptom | Cause | Action needed? |
| --- | --- | --- |
| Extra **Node** processes (`node.exe`) | Each edit or shell command spawns a short-lived hook + CLI check | Usually **no** — normal on busy sessions |
| A **side panel or hook activity** in Cursor | Cursor surfacing hook execution or agent messages | Usually **no** in `warn` mode |
| **“Spec Guardrails blocked this edit”** | Context guard — file outside task `Files` | **Yes** — fix tasks or scope |
| **“Sandbox blocked this command”** | Sandbox in **`strict`** mode matched a deny rule | **Yes** — review the command or change policy |

You do **not** operate hooks manually. They run when the agent uses write/edit tools or the integrated shell.

---

## What this is (and is not)

Spec Guardrails ships **soft governance** — policy checks that align the agent with approved specs and tasks.

| It is | It is not |
| --- | --- |
| Automatic scope check before file writes | An OS container or VM sandbox |
| Regex/policy block for obvious destructive shell commands | Protection against reading `.env` or secrets (no read hook yet) |
| A safety net when the agent forgets scope | A replacement for your spec/task approval or git tiers |

Hooks **reduce blast radius**; they do **not** remove human review, `/verify`, or PR approval.

---

## Two layers (when enabled)

### 1. Context guard — “stay inside task Files”

| | |
| --- | --- |
| **Event** | `preToolUse` (before Write, StrReplace, EditNotebook, ApplyPatch, …) |
| **Script** | `.cursor/hooks/context-guard-edit.mjs` |
| **Checks** | Active feature, open tasks, path listed in task **Files** |
| **Skips** | `.specs/`, `.cursor/`, `node_modules/` |

**When it blocks:** the agent tries to edit a path not covered by the current task list.

**What you do:** ensure `/tasks` lists the right **Files**, or ask the agent to update tasks before expanding scope. Same rules as the CLI:

```bash
npx @luizsantiago/spec-guardrails context-guard status
npx @luizsantiago/spec-guardrails context-guard check-edit src/auth.ts --op write
```

**When it is most useful:** during `/loop` after you approved a task plan with explicit file ownership.

### 2. Sandbox shell — “don’t run obviously destructive commands”

| | |
| --- | --- |
| **Event** | `beforeShellExecution` (before every agent shell command) |
| **Script** | `.cursor/hooks/sandbox-shell.mjs` |
| **Checks** | Command string against deny patterns (see below) |
| **Config** | `.specs/config.yaml` → `sandbox.mode` |

Default deny patterns include: recursive force delete (`rm -rf`), curl/wget piped to shell, force-push to `main`/`master`, destructive SQL (`DROP DATABASE`, `TRUNCATE`, …). You can add custom regexes under `sandbox.deny_patterns`.

CLI equivalents:

```bash
npx @luizsantiago/spec-guardrails sandbox status
npx @luizsantiago/spec-guardrails sandbox check-command "rm -rf /tmp/x" --json
```

---

## Sandbox modes

Configure in `.specs/config.yaml` (see `config.yaml.example`):

```yaml
sandbox:
  mode: warn   # off | warn | strict
  deny_patterns:
    - "rm\\s+-rf"
```

| Mode | Shell hook behavior | User action |
| --- | --- | --- |
| **`off`** | Always allow; hook still runs the check | None |
| **`warn`** *(default)* | Allow; agent may receive a warning message | None unless you want to stop the agent |
| **`strict`** | **Deny** matching commands | Review or override policy |

Context guard blocking is independent of sandbox mode — out-of-scope edits are denied regardless of `sandbox.mode`.

---

## Your day-to-day workflow (unchanged)

Hooks sit **under** the normal Spec Guardrails loop. You still:

1. **`/specify`** and approve the spec  
2. **`/tasks`** with accurate **Files** per job  
3. **`/loop`** — agent implements; hooks enforce scope automatically  
4. **`/verify`** — proof before done  
5. Approve **git tiers** (push, PR, merge) yourself  

You do **not** need to learn hook APIs. Keeping `tasks.md` honest is the main lever for context guard.

---

## Performance (especially Windows)

Each hook invocation starts Node and calls the Spec Guardrails CLI (default: `npx @luizsantiago/spec-guardrails …`). On long agent sessions this can mean many short-lived `node.exe` processes.

**Lighter CLI for hooks** — set before launching Cursor:

```powershell
# PowerShell — point to a local or global install instead of npx
$env:SPEC_GUARDRAILS_CLI = "npx @luizsantiago/spec-guardrails"
# Or, in this source repo while developing the package:
$env:SPEC_GUARDRAILS_CLI = "node C:\path\to\spec-guardrails\index.js"
```

Both hook scripts read `SPEC_GUARDRAILS_CLI` when set.

---

## Tuning or disabling

### Soften sandbox only

```yaml
# .specs/config.yaml
sandbox:
  mode: off
```

Stops warnings and strict blocks. The shell hook **still runs** (CLI cost remains).

### Disable sandbox hook only

Edit `.cursor/hooks.json` — remove the `beforeShellExecution` entry for `sandbox-shell.mjs`. User hooks and the context-guard entry are preserved unless you removed them yourself. To re-enable shipped hooks later, run `install --with-cursor-hooks`.

### Disable context guard hook

Remove the `preToolUse` entry for `context-guard-edit.mjs` from `.cursor/hooks.json`. You can still run `context-guard check-edit` manually or rely on agent discipline.

### Disable all Spec Guardrails hooks

```bash
npx @luizsantiago/spec-guardrails install --without-cursor-hooks
```

Or clear shipped entries from `.cursor/hooks.json` manually. The rest of Spec Guardrails (skills, `.specs/`, gates) continues to work.

---

## Files on disk

| Path | Role |
| --- | --- |
| `.cursor/hooks.json` | Hook registry (merged with your existing hooks on reinstall) |
| `.cursor/hooks/context-guard-edit.mjs` | Edit-scope check |
| `.cursor/hooks/sandbox-shell.mjs` | Shell command policy check |

These paths are **gitignored** in the Spec Guardrails source repo (dogfood install output). In consumer projects, commit `.cursor/hooks.json` if you want the team to share the same hook setup.

---

## Related

| Topic | Link |
| --- | --- |
| Execution policy (paths, budgets, effects) | [Overview → Safety and limits](Overview.md#safety-and-limits) |
| Context guard CLI | [Agent commands](agent-commands.md) |
| Guarantees | [Guarantees matrix](Guarantees-matrix.md) |
| Config template | `templates/config.yaml.example` (shipped as `.specs/config.yaml.example`) |
| Future: container sandbox | Optional plugin — not core; see [Restart PRD seed](Restart-prd-seed.md) |
