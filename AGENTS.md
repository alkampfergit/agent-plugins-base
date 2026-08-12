# agent-plugins-base

This repository is a plugin marketplace shared across Claude Code, GitHub Copilot
(CLI/VS Code/cloud agent), and OpenAI Codex (CLI/ChatGPT). Each plugin lives once
under `plugins/<name>/` with thin, client-specific manifests layered on top of a
shared `skills/` tree — never fork a plugin's content per client.

## Adding or changing a plugin

Before touching any `plugin.json`, `marketplace.json`, `mcp.json`, or `hooks.json` in
this repo, load the `multi-client-plugin-packaging` skill
(`.claude/skills/multi-client-plugin-packaging/SKILL.md`) — it has the full rule set,
copy-paste manifest templates, and a validator:

```
node .claude/skills/multi-client-plugin-packaging/scripts/validate-plugin-repo.mjs .
```

Run it after any manifest edit, alongside `claude plugin validate . --strict`.

## Layout

```
plugins/<name>/            plugin.json, .claude-plugin/, .codex-plugin/, skills/, ...
.claude-plugin/marketplace.json    Claude Code catalog
.github/plugin/marketplace.json    Copilot catalog
.agents/plugins/marketplace.json   Codex catalog
```

The three marketplace catalogs above **MUST** list the same set of plugins, pointing
at the same `./plugins/<name>` paths.
