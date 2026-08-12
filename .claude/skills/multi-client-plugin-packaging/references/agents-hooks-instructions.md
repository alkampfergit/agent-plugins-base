# Agents, hooks, and repo-level instruction files (R6–R8)

## Custom agents / subagents (R6.x)
Not standardized by Agent Plugins v1 — treat as a bonus, not a foundation.

### R6.1 — File naming
Name agent files `agents/<name>.agent.md`. Copilot requires the `.agent.md` suffix;
Claude Code scans `agents/` for markdown and reads the frontmatter, so a `.agent.md`
file works for both provided frontmatter `name` is set explicitly.

### R6.2 — Keep frontmatter to the intersection
```yaml
---
name: telemetry-reviewer
description: Reviews OpenTelemetry instrumentation for span and metric correctness.
model: sonnet
tools: [read, search]
---
```
`name`, `description`, `model`, `tools` are broadly understood. Anything beyond that is
client-specific: Claude Code additionally supports `effort`, `maxTurns`,
`disallowedTools`, `skills`, `memory`, `background`, `isolation`. Claude Code
**forbids** `hooks`, `mcpServers`, and `permissionMode` in plugin-shipped agents for
security reasons — do not attempt them.

### R6.3 — Expect namespacing and first-found-wins
Claude Code exposes plugin agents as `<plugin>:<agent>`. Copilot dedupes agents by ID
derived from filename, **first loaded wins**, and project-level definitions beat
plugin-level ones silently. Choose distinctive agent names; a generic `reviewer` will
be shadowed.

## Hooks — the least portable component (R7.x)
Hooks work in all three clients but the **event vocabularies are different and
non-overlapping in places**. Claude Code alone defines 30+ events (`PreToolUse`,
`PostToolUseFailure`, `UserPromptExpansion`, `WorktreeCreate`, `InstructionsLoaded`,
…). Codex and Copilot define their own sets.

### R7.1 — Hooks MUST NOT be load-bearing
A plugin **MUST** remain useful with hooks disabled. Codex treats plugin-bundled
hooks as untrusted and skips them until the user explicitly reviews and trusts the
definition; a plugin whose core value depends on a hook will appear broken on first
install.

### R7.2 — Default path, portable shape
Put hooks at `hooks/hooks.json` (read by all three at the default path) and use only
widely supported events — realistically `SessionStart` and the pre/post tool-use pair.
Gate anything else behind a client-specific manifest field.

### R7.3 — Environment variables in hook commands
Use `${CLAUDE_PLUGIN_ROOT}` — Codex and Copilot both alias it explicitly for
compatibility, so it is the *most* portable of the three spellings. Prefer exec form
with `args`; in shell form, always double-quote:
`"${CLAUDE_PLUGIN_ROOT}"/scripts/run.sh`.

### R7.4 — Never write state into the plugin root
`PLUGIN_ROOT` changes on every update and old versions are garbage-collected (Claude
Code sweeps orphaned version dirs after ~14 days). All mutable state —
`node_modules`, venvs, caches, generated files — goes in `${PLUGIN_DATA}` /
`${CLAUDE_PLUGIN_DATA}`, which is guaranteed to survive updates.

## Repo-level instruction files ≠ plugin content (R8.x)
A frequent and expensive confusion. These files configure agents working **on this
repository**. They are **not** shipped to plugin consumers.

| File | Read by | Purpose |
|---|---|---|
| `AGENTS.md` (root, nestable) | Codex, Copilot cloud agent, most agents | Primary repo instructions |
| `CLAUDE.md` (root) | Claude Code (project context) | Thin pointer: `See AGENTS.md.` |
| `.github/copilot-instructions.md` | Copilot everywhere | Repo-wide Copilot instructions |
| `.github/instructions/*.instructions.md` | Copilot (`applyTo:` glob) | Path-scoped rules |
| `.github/prompts/*.prompt.md` | Copilot Chat | Reusable slash-invoked prompts |
| `.github/chatmodes/*.chatmode.md` | Copilot Chat | Personas |
| `.github/agents/*.agent.md` | Copilot | Repo-level custom agents |

### R8.1 — A plugin's `CLAUDE.md` is NOT loaded
Claude Code explicitly does **not** load a `CLAUDE.md` at the plugin root as context.
To ship instructions to consumers, put them in a **skill**. This is the correct and
only mechanism.

### R8.2 — Single source, thin pointers
Write `AGENTS.md` once. `CLAUDE.md` and `.github/copilot-instructions.md` **SHOULD**
be one-line pointers to it rather than divergent copies.
