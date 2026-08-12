# Changelog

## 0.1.1

- Restructured under `plugins/github-alk/` for multi-client packaging (Claude Code,
  GitHub Copilot, OpenAI Codex).
- Added the Agent Plugins v1 manifest (`plugin.json`) and Codex manifest
  (`.codex-plugin/plugin.json`).
- Skills: `gh-cli-guide`, `gh-actions-debug`, `github-pr-manager`, `sonarcloud`,
  `sonarcloud-pr-fix` (ported from azdo-cli, renamed pr-fixer to github-pr-manager,
  cleaned up).
