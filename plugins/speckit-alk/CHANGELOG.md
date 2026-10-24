# Changelog

## 0.2.0

- `speckit-full` exchanges every conductor instruction on GitHub: a required `control-issue` thread carries the preview, `approve <revision>` authorization, status, and `stop` requests; console consent is no longer accepted.
- Resolve the conductor (owner for personal repos, verified `conductor` input for organizations) and pass it to `speckit-gh` as the approver.

## 0.1.0

- Add Claude-first `speckit-gh` and `speckit-full` GitHub issue workflows.
- Keep upstream Spec Kit skills project-installed through `specify init`; do not bundle duplicate copies.
- Add shared plugin manifests for Claude Code, GitHub Copilot, and OpenAI Codex.
