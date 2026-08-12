# MCP servers (R4.x)

MCP is the second portable component type — but the file name and the schema differ
between the open spec and the client-native format. Ship **both**.

## R4.1 — `mcp.json` (Agent Plugins v1, no leading dot)
```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "jarvis-plm": {
      "type": "streamable-http",
      "url": "https://plm.example.com/jarvis-mcp/plm/mcp"
    },
    "local-validator": {
      "type": "stdio",
      "command": "./bin/validator",
      "args": ["--data", "${PLUGIN_DATA}/validator"],
      "env": { "CONFIG": "${PLUGIN_ROOT}/config.json" },
      "cwd": "${PLUGIN_ROOT}"
    }
  }
}
```
- Only `$schema` and `mcpServers` are permitted at top level.
- `$schema` version **MUST** match the version in `plugin.json`, or MCP is disabled for
  the plugin.
- `type` is **REQUIRED** and selects a closed variant: `stdio` | `streamable-http` |
  `sse`. An unknown field or a field from another variant invalidates *that server
  entry only*.
- `command` **MUST** be a single token: a bare executable name, or a `./`-prefixed
  plugin-relative path. **Never** a shell string. No placeholder expansion happens in
  `command`.
- `${PLUGIN_ROOT}` / `${PLUGIN_DATA}` expand **only** in `args`, `env` values, and
  `cwd`. Not in `env` keys, not in `command`, not in `url` or `headers`.
- `env` **MUST NOT** define `PLUGIN_ROOT` or `PLUGIN_DATA` — that invalidates the
  entry.
- Non-loopback `url` **MUST** be HTTPS. `sse` is the deprecated 2024-11-05 transport;
  prefer `streamable-http`.

## R4.2 — `.mcp.json` (client-native, leading dot)
Claude Code, Copilot, and Codex all read `.mcp.json` at the plugin root in their own
(typed-implicit) format:
```json
{
  "mcpServers": {
    "jarvis-plm": { "type": "http", "url": "https://plm.example.com/jarvis-mcp/plm/mcp" },
    "local-validator": {
      "command": "${CLAUDE_PLUGIN_ROOT}/bin/validator",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    }
  }
}
```
Generate this from `mcp.json` — don't hand-maintain two schemas in parallel. Codex also
accepts a wrapped `{"mcp_servers": {...}}` form; do not use it — the direct map is what
all three read.

## R4.3 — Secrets are forbidden in the package
No credentials in `env`, no credentials in `headers`. Agent Plugins v1 defines **no**
portable credential mechanism; authorization is entirely client-managed. Use
`userConfig` (Claude Code, marked `sensitive: true`) or the client's connector/auth
flow. Anything committed to the repo is public to every user of the plugin.

## R4.4 — Claude Code `userConfig` values never reach a shell
Claude Code **rejects** `${user_config.*}` in shell-form hook commands and monitor
commands. Use exec form with `args`, or read `CLAUDE_PLUGIN_OPTION_<KEY>` from the
hook's environment.
