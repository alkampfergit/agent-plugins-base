# Marketplace catalogs (R5.x)

The repo root **MUST** carry three catalogs. They point at the same
`./plugins/<name>` directories but have different required fields.

## R5.1 — `.claude-plugin/marketplace.json`
```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "agent-plugins-base",
  "owner": { "name": "Alkampfer", "url": "https://github.com/alkampfergit" },
  "description": "Cross-client agent plugins.",
  "metadata": { "pluginRoot": "./plugins" },
  "plugins": [
    { "name": "jarvis-telemetry", "source": "./plugins/jarvis-telemetry",
      "description": "OpenTelemetry and Application Insights workflows.", "category": "development" }
  ],
  "renames": {}
}
```
- `name`, `owner`, `plugins[]` are required. Marketplace `name` is the public install
  suffix (`/plugin install x@agent-plugins-base`).
- Reserved names (`claude-plugins-official`, `anthropic-plugins`, `agent-skills`,
  `first-party-plugins`, …) and impersonating names are rejected. Also avoid `org`,
  `org-provisioned`, `unknown` — Claude Desktop's sync rejects the whole marketplace.
- Plugin names **MUST** be kebab-case. Claude Code tolerates other forms;
  claude.ai marketplace sync does not.
- `renames` is **append-only**. When a plugin is renamed or removed, add
  `"old-name": "new-name"` or `"old-name": null`. Never edit or delete an existing
  entry — Claude Code follows chains, and a cycle fails validation.
- `source` relative paths resolve against the **marketplace root** (the directory
  containing `.claude-plugin/`), not against `.claude-plugin/` itself.
- Do **not** use `strict: false` here; it makes the marketplace entry the entire
  plugin definition and conflicts with the plugin's own `plugin.json`.

## R5.2 — `.github/plugin/marketplace.json`
Same shape, Copilot-flavoured. Required: `name`, `owner`, `plugins[]`. Metadata lives
under `metadata: { description, version }`.

Do **not** set `metadata.pluginRoot` here. Copilot prepends it to every relative
`source`, so `pluginRoot: "./plugins"` + `source: "./plugins/x"` resolves to
`plugins/plugins/x` ("Plugin source directory not found"). Claude Code applies
`pluginRoot` only to bare names, which is why the same pair works in R5.1.

```json
{
  "name": "agent-plugins-base",
  "owner": { "name": "Alkampfer", "email": "..." },
  "metadata": { "description": "Cross-client agent plugins.", "version": "1.0.0" },
  "plugins": [
    { "name": "jarvis-telemetry", "version": "1.2.0",
      "description": "OpenTelemetry and Application Insights workflows.",
      "source": "./plugins/jarvis-telemetry" }
  ]
}
```
Copilot would also fall back to `.claude-plugin/marketplace.json`, but declaring the
native path is explicit and survives changes to the fallback chain.

## R5.3 — `.agents/plugins/marketplace.json`
Codex requires `policy` and `category` on every entry; omitting them is the most
common reason a plugin silently fails to appear.

```json
{
  "name": "agent-plugins-base",
  "interface": { "displayName": "Agent Plugins Base" },
  "plugins": [
    {
      "name": "jarvis-telemetry",
      "source": { "source": "local", "path": "./plugins/jarvis-telemetry" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Developer Tools"
    }
  ]
}
```
- `source.path` is relative to the **marketplace root**, not to `.agents/plugins/`.
- `policy.installation` ∈ `AVAILABLE` | `INSTALLED_BY_DEFAULT` | `NOT_AVAILABLE`.
- If Codex cannot resolve one entry's source it skips that entry rather than failing
  the catalog — so a broken entry is invisible unless CI catches it.

## R5.4 — Remote sources: pin with `sha`, not just `ref`
For `github`, `url`, and `git-subdir` sources across all three catalogs, a 40-char
`sha` is the effective pin and survives force-pushes and moved tags. Use `ref` for
human readability, `sha` for reproducibility. `git-subdir` does a sparse partial
clone — prefer it over `github` when the plugin lives in a monorepo.

## R5.5 — URL-served catalogs break relative sources
If a user adds the marketplace by direct URL to the JSON file, only that file is
downloaded and `./plugins/...` cannot resolve. Distribute via git repo URL or
`owner/repo` shorthand. If you must serve a bare JSON file, every entry **MUST** use
`github`, `git-subdir`, `npm`, or `archive` sources.
