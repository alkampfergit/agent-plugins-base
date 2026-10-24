# agent-plugins-base

A plugin marketplace for AI coding agents — Claude Code, GitHub Copilot, and OpenAI
Codex — packaged from one shared source tree.

## Plugins

| Plugin | Skills | Agents | Description |
|---|---|---:|---|
| [`github-alk`](plugins/github-alk) | `gh-actions-debug`, `gh-cli-guide`, `github-pr-manager`, `sonarcloud`, `sonarcloud-pr-fix` | 0 | GitHub CLI, CI, PR, and SonarCloud automation. |
| [`speckit-alk`](plugins/speckit-alk) | `speckit-full`, `speckit-gh` | 0 | Claude-first, human-approved GitHub issue-to-PR workflows using upstream Spec Kit. |

## Install

```text
# Claude Code
/plugin marketplace add alkampfergit/agent-plugins-base
/plugin install github-alk@agent-plugins-base
/plugin install speckit-alk@agent-plugins-base

# GitHub Copilot CLI
copilot plugin marketplace add alkampfergit/agent-plugins-base
copilot plugin install github-alk@agent-plugins-base
copilot plugin install speckit-alk@agent-plugins-base

# OpenAI Codex CLI
codex plugin marketplace add alkampfergit/agent-plugins-base
codex plugin add github-alk@agent-plugins-base
codex plugin add speckit-alk@agent-plugins-base
```

## Contributing a plugin

See [AGENTS.md](AGENTS.md) — every plugin follows the layout and manifest rules in
the `multi-client-plugin-packaging` skill under `.claude/skills/`.
