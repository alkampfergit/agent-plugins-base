# What does not port — accept and design around it

| Feature | Portable? | Note |
|---|---|---|
| Skills (`SKILL.md`) | Yes — all clients | The foundation. |
| MCP servers | Yes — all clients | Two file formats (see `mcp-servers.md`). |
| Slash commands | Partial — Claude Code + Copilot | Codex has no plugin-level equivalent; Claude Code recommends `skills/` over `commands/` for new plugins. |
| Custom agents | Partial — all three, different frontmatter | Keep to the intersection (see `agents-hooks-instructions.md` §R6). |
| Hooks | Partial — all three, different events | Non-load-bearing only (§R7). |
| LSP servers | No — Claude Code + Copilot only | Different schemas (`extensionToLanguage` vs `fileExtensions`). |
| Output styles / themes / monitors / workflows | No — Claude Code only | Isolate in the Claude manifest. |
| `.app.json` connector mappings | No — Codex only | ChatGPT-registered MCP connections. |
| `interface` store-front metadata | No — Codex only | Harmless elsewhere (ignored as unknown field). |
| `userConfig` prompted settings | No — Claude Code only | Other clients need env vars or their own config. |
| Credentials / OAuth | No — nobody | v1 defines no portable credential mechanism. Client-managed, always. |
