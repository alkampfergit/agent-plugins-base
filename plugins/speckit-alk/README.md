# speckit-alk

Claude-first orchestration for driving GitHub issues through the **upstream GitHub Spec Kit** workflow. The plugin adds two custom workflows; it does not copy, replace, or version Spec Kit's own skills.

## Skills

- **speckit-gh** — drive one GitHub issue through specify, clarify, plan, tasks, implementation, verification, and a review-ready PR. Human approval is required at each specification gate.
- **speckit-full** — discover issues with a caller-selected label and run `speckit-gh` in bounded cycles. A read-only preview is required before the first live cycle.

## Agents

None. The portable unit is the two skills; clients may choose their own built-in delegation mechanism.

## Requirements

- `gh` installed and authenticated with repository read/write access.
- The target repository has Git remote `origin`, a clean checkout on its default branch, and Git author identity configured.
- GitHub Spec Kit is initialized in the target project with `specify init`; upstream Spec Kit skills and templates are supplied by that project setup, not this plugin.
- A human approver is identifiable from GitHub. For organization-owned repositories, configure/confirm a human approver rather than treating the organization login or the automation account as approval.

## Client behavior

Claude Code is the primary target. Its built-in `/loop` and scheduled-task tools may be used only when available and with explicit user approval; loops are session-bound and can expire. Codex and Copilot can run a single `speckit-full` cycle. For repeated polling in those clients, use an external scheduler that invokes a fresh single cycle; the skill does not pretend their scheduling APIs are equivalent.

All clients must stop safely when the required upstream Spec Kit skills, `gh` authentication, or repository prerequisites are unavailable. Dirty worktrees are reported, never auto-committed, stashed, reset, or pushed by a repair helper.

## Install

From the `agent-plugins-base` marketplace:

```text
# Claude Code
/plugin marketplace add alkampfergit/agent-plugins-base
/plugin install speckit-alk@agent-plugins-base

# GitHub Copilot CLI
copilot plugin marketplace add alkampfergit/agent-plugins-base
copilot plugin install speckit-alk@agent-plugins-base

# OpenAI Codex CLI
codex plugin marketplace add alkampfergit/agent-plugins-base
codex plugin add speckit-alk@agent-plugins-base
```
