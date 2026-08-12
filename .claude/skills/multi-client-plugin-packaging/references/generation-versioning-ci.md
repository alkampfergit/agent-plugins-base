# Generation, CI, and versioning (R9–R11)

## Generate, don't hand-maintain (R9.x)
Six or more JSON files must agree on the same facts. Hand-editing them guarantees
drift.

### R9.1 — Single source of truth
Maintain one file — `plugin-source.yaml` per plugin, or derive from the root
`plugin.json` — and generate: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`,
`.mcp.json` (from `mcp.json`), and all three `marketplace.json` catalogs.

### R9.2 — Generated files are committed and marked
All generated artifacts **MUST** be committed (clients read from git, not from a
build) and **MUST** carry a marker so no one edits them by hand:
```json
{ "_generated": "DO NOT EDIT — run scripts/generate-manifests.mjs" }
```
Claude Code and Copilot ignore unrecognized top-level fields, so this marker is safe
in client manifests. It is **not** safe in the root Agent Plugins `plugin.json`
(closed schema — it would be reported as an unknown field); use a sidecar README note
there instead.

### R9.3 — CI enforces regeneration
The validation workflow **MUST** re-run the generator and fail on any diff.

## Validation and CI (R10.x)

### R10.1 — Required checks
```bash
# Claude Code — validates marketplace, every plugin.json, and skill/agent/command frontmatter
claude plugin validate . --strict
claude plugin validate ./plugins/<name> --strict

# Agent Plugins v1 — validate against the canonical schemas
# https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
# https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
ajv validate -s plugin.schema.json -d "plugins/*/plugin.json"

# Agent Skills — validate every SKILL.md
skills-ref validate plugins/*/skills/*

# Copilot
copilot plugin marketplace add . && copilot plugin install <name>@agent-plugins-base

# Codex
codex plugin marketplace add ./ && codex plugin marketplace list
```
`--strict` promotes unknown-field warnings to errors — exactly what catches a field
left over from another ecosystem's manifest.

### R10.2 — Additional CI assertions
(These are what `scripts/validate-plugin-repo.mjs` in this skill automates.)
1. Directory name == `name` in all three manifests, for every plugin.
2. `version` identical across all manifests **and** absent from marketplace entries
   (or consistent with them).
3. Every skill folder name == its `SKILL.md` frontmatter `name`.
4. No `..` in any manifest path; every path starts with `./`.
5. No symlink resolving outside the plugin root.
6. Every `scripts/*.sh` and hook command has the executable bit set.
7. No high-entropy strings in `env` / `headers` (secret scan).
8. Generator produces no diff.
9. All three `marketplace.json` files list the same plugin set.

### R10.3 — Test order
Validate with **Copilot CLI first, VS Code second**. VS Code's agent-plugin support
caches aggressively and fails silently on manifest errors; the CLI reports them.

## Versioning and release (R11.x)

### R11.1 — Semantic versioning, bumped everywhere at once
MAJOR = breaking change to a skill's contract or a removed component. MINOR = new
skill/agent/server. PATCH = wording and fixes.

### R11.2 — Pick one versioning strategy per plugin and document it
| Strategy | How | Update behaviour |
|---|---|---|
| Explicit | `version` in `plugin.json` | Users update only when you bump the string. **You must bump every release.** |
| Commit-SHA | omit `version` everywhere | Users update whenever the source commit changes. Best for internal/fast-moving plugins. |

Mixing them — a stale `version` in `plugin.json` while pushing commits — makes updates
invisible and is the single most confusing failure mode in the Claude Code plugin
system.

Verified live with Codex CLI (0.147.0): `codex plugin add` keys its on-disk cache off
`plugin@version`. Editing a plugin's files without bumping `version` and reinstalling
from the same local marketplace source served the **old** cached copy — new files
(a newly added `.codex-plugin/plugin.json`, `README.md`, etc.) were silently absent
until `version` was bumped (or `codex plugin remove` + delete the cache dir under
`~/.codex/plugins/cache/<marketplace>/<plugin>/<version>` first). Expect the same from
Claude Code and Copilot caches — treat "no version bump" as "no update," full stop.

### R11.3 — Tag releases
Use `claude plugin tag --push` (creates the `<plugin-name>--v<version>` tag convention
used for dependency range resolution). Maintain a per-plugin `CHANGELOG.md`.

### R11.4 — Renames are a migration, not an edit
Changing a plugin's `name` breaks every existing install (`enabledPlugins`,
`pluginConfigs`, install commands). To change only the displayed label, set
`displayName` (Claude Code / Copilot) or `interface.displayName` (Codex) and leave
`name` alone. If a real rename is unavoidable, add a `renames` entry
(`marketplaces.md` §R5.1) and keep it forever.
