# Manifests (R3.x)

- [R3.1 — Root `plugin.json`](#r31--root-pluginjson-is-the-agent-plugins-v1-manifest) (Agent Plugins v1, the conformance floor)
- [R3.2 — `.claude-plugin/plugin.json`](#r32--claude-pluginpluginjson-is-the-claude-code-manifest)
- [R3.3 — `.codex-plugin/plugin.json`](#r33--codex-pluginpluginjson-is-the-codex-manifest)
- [R3.4 — `.plugin/plugin.json`](#r34--do-not-add-pluginpluginjson-unless-you-mean-it) (Copilot shadow manifest — use sparingly)
- [R3.5 — Byte-consistency across manifests](#r35--keep-the-three-manifests-byte-consistent-on-shared-fields)

## R3.1 — Root `plugin.json` is the Agent Plugins v1 manifest
This is the conformance floor and what Copilot, Codex, VS Code, and Cursor read first
when no client-specific manifest shadows it.

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "jarvis-telemetry",
  "version": "1.2.0",
  "description": "OpenTelemetry and Application Insights workflows for the Jarvis platform.",
  "author": { "name": "Alkampfer", "url": "https://www.codewrecks.com" },
  "homepage": "https://github.com/alkampfergit/agent-plugins-base",
  "repository": "https://github.com/alkampfergit/agent-plugins-base",
  "license": "MIT",
  "keywords": ["telemetry", "opentelemetry", "dotnet"],
  "extensions": {
    "com.codewrecks.plugins": { "channel": "stable" }
  }
}
```

Hard constraints:
- `$schema` and `name` are **REQUIRED**. Any other schema violation is **fatal** — the
  whole plugin is rejected.
- The schema is **closed**: only `$schema`, `name`, `version`, `description`, `author`,
  `homepage`, `repository`, `license`, `keywords`, `extensions` are permitted. Unknown
  top-level fields are reported and ignored (non-fatal), but do not add them.
- `name`: 1–64 chars, `a-z0-9.-`, first and last char alphanumeric, no `--` and no `..`.
- `author` may contain **only** `name`, `email`, `url`. Any other key is fatal.
- Component locations **cannot** be declared here. `skills/` and `mcp.json` are fixed.
  This is by design.
- Client-specific data goes under a reverse-domain key in `extensions`, or in a
  top-level `com.example.client/` directory. Nowhere else.

## R3.2 — `.claude-plugin/plugin.json` is the Claude Code manifest
Claude Code **ignores unrecognized top-level fields** (warning only), which is
precisely what allows a shared shape. Keep it close to the v1 manifest and add only
Claude-native keys you actually need.

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "jarvis-telemetry",
  "displayName": "Jarvis Telemetry",
  "version": "1.2.0",
  "description": "OpenTelemetry and Application Insights workflows for the Jarvis platform.",
  "author": { "name": "Alkampfer", "url": "https://www.codewrecks.com" },
  "repository": "https://github.com/alkampfergit/agent-plugins-base",
  "license": "MIT",
  "keywords": ["telemetry", "opentelemetry", "dotnet"]
}
```

- `name` is the only required field; the manifest itself is optional but **MUST** be
  present here for deterministic naming.
- `repository` **MUST** be a string URL, not an object.
- Do **not** declare `commands`, `agents`, `workflows`, `outputStyles` unless you need a
  non-default path: those fields **replace** the default directory scan. `skills` is
  the exception — it *adds* to the default `skills/` scan.
- Prefer omitting `version` for internal/fast-moving plugins (Claude Code then keys
  updates off the git SHA). If you set it, you **MUST** bump it on every release or
  users keep the cached copy forever.
- **Never** set `version` in both `plugin.json` and the marketplace entry —
  `plugin.json` silently wins.

## R3.3 — `.codex-plugin/plugin.json` is the Codex manifest
Codex is the one client that requires explicit component pointers plus store-front
metadata.

```json
{
  "name": "jarvis-telemetry",
  "version": "1.2.0",
  "description": "OpenTelemetry and Application Insights workflows for the Jarvis platform.",
  "author": { "name": "Alkampfer", "url": "https://www.codewrecks.com" },
  "homepage": "https://github.com/alkampfergit/agent-plugins-base",
  "repository": "https://github.com/alkampfergit/agent-plugins-base",
  "license": "MIT",
  "keywords": ["telemetry", "opentelemetry", "dotnet"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "hooks": "./hooks/hooks.json",
  "interface": {
    "displayName": "Jarvis Telemetry",
    "shortDescription": "OTel + App Insights workflows",
    "longDescription": "Skills for modelling client-side HTTP spans and .NET runtime metrics.",
    "developerName": "Alkampfer",
    "category": "Developer Tools",
    "capabilities": ["Read", "Write"],
    "websiteURL": "https://www.codewrecks.com",
    "composerIcon": "./assets/icon.png",
    "logo": "./assets/logo.png"
  }
}
```

- `.codex-plugin/` **MUST** contain only `plugin.json`.
- `hooks` may be omitted if hooks live at the default `./hooks/hooks.json` — Codex
  checks that path automatically.
- Use `apps` **only** to point at `.app.json` (registered MCP connection mappings). It
  is a compatibility field, not a general extension point.
- `interface` is what the ChatGPT/Codex Plugins Directory renders. Populate it before
  any distribution beyond your own machine.

## R3.4 — Do not add `.plugin/plugin.json` unless you mean it
Copilot's search order puts `.plugin/plugin.json` **above** root `plugin.json`. Adding
it shadows your portable manifest for all Copilot surfaces. Use it only when you need
Copilot-specific component paths (`agents`, `commands`, `lspServers`) that the spec
manifest cannot express — and then document the divergence in the plugin README.

## R3.5 — Keep the three manifests byte-consistent on shared fields
`name`, `version`, `description`, `author`, `license`, `repository`, `homepage`,
`keywords` **MUST** be identical across all manifests present. Enforce in CI (see
`generation-versioning-ci.md`). Generate them, don't hand-edit each.
