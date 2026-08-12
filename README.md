# agent-plugins-base

A plugin marketplace for AI coding agents — Claude Code, GitHub Copilot, and OpenAI
Codex — packaged from one shared source tree.

## Plugins

| Plugin | Description |
|---|---|
| [`github-alk`](plugins/github-alk) | GitHub CLI, CI, PR, and SonarCloud automation skills. |

## Install

```
# Claude Code
/plugin marketplace add alkampfergit/agent-plugins-base
/plugin install github-alk@agent-plugins-base

# GitHub Copilot CLI
copilot plugin marketplace add alkampfergit/agent-plugins-base
copilot plugin install github-alk@agent-plugins-base

# OpenAI Codex CLI
codex plugin marketplace add alkampfergit/agent-plugins-base
codex plugin install github-alk
```

## Contributing a plugin

See [AGENTS.md](AGENTS.md) — every plugin follows the layout and manifest rules in
the `multi-client-plugin-packaging` skill under `.claude/skills/`.
