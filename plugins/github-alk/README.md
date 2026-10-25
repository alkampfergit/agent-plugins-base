# github-alk

GitHub CLI, CI, PR, and SonarCloud automation skills, ported from azdo-cli.

## Skills

- **gh-cli-guide** — reference guide for `gh` command patterns; other skills in this
  plugin call into it rather than duplicating raw commands.
- **gh-actions-debug** — diagnose and fix failing GitHub Actions workflows.
- **github-pr-manager** — automatically selectable for PR work: inspect or fix a
  PR in one pass by default; optionally monitor when explicitly requested; open
  PRs, handle reviewer comments, and close release PRs.
- **sonarcloud** — analyze and fix SonarCloud issues on pull requests.
- **sonarcloud-pr-fix** — end-to-end SonarCloud cleanup for the current branch's PR.

## Requirements

- [`gh`](https://cli.github.com/) installed and authenticated (`gh auth status`).

## Install

This plugin is distributed from the `agent-plugins-base` marketplace
(`alkampfergit/agent-plugins-base`).

```
# Claude Code
/plugin marketplace add alkampfergit/agent-plugins-base
/plugin install github-alk@agent-plugins-base

# GitHub Copilot CLI
copilot plugin marketplace add alkampfergit/agent-plugins-base
copilot plugin install github-alk@agent-plugins-base

# OpenAI Codex CLI
codex plugin marketplace add alkampfergit/agent-plugins-base
codex plugin add github-alk@agent-plugins-base
```
