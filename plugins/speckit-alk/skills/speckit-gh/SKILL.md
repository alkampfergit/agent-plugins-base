---
name: speckit-gh
description: Drive one GitHub issue through the upstream Spec Kit workflow to a verified, review-ready pull request, with human approval at each specification gate. Use when asked to implement a GitHub issue with Spec Kit or given an issue link.
compatibility: Requires gh, Git, and a target repository initialized with GitHub Spec Kit.
metadata:
  author: alkampfer
  plugin: speckit-alk
---

# speckit-gh — one issue, human-approved

Take one GitHub issue through specification, planning, implementation, testing, and a review-ready PR. The upstream Spec Kit skills are installed in the target repository by `specify init`; this plugin contains only orchestration and must not replace or copy those skills.

## Hard boundaries

- Use this workflow only for the issue and repository the user identified. Resolve `owner/repo` from the issue URL or `git remote get-url origin`; confirm before crossing repositories.
- Require `gh auth status`, a clean worktree, and the repository's default branch before starting. Never auto-stash, reset, clean, commit unrelated files, or invoke a fixer to make the tree clean. Stop and report any dirty state.
- Require `.specify/` plus the upstream `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, and `speckit-implement` workflows. Confirm paths and commands from the installed project instead of assuming a version-specific layout. Do not bootstrap Spec Kit from this skill.
- Accept live-cycle authorization either from a direct user confirmation after the preview or from a matching, previously approved `speckit-full` run. That authorization does not replace the human approver's GitHub approval at each Spec Kit gate.
- Resolve the human approver. For personal repositories, use the owner login. For organization-owned repositories, ask the user to identify the authorized human maintainer. Never treat the authenticated `gh` account, a bot, or the organization login as human approval.
- Before standalone live-run authorization, use the agent console for preflight questions and blockers, the read-only preview, and initial user consent. After authorization (directly or through a matching approved `speckit-full` run), post all workflow questions, proposals, status, and approval requests only on the active GitHub issue or PR. Accept Spec Kit gate approval only from the resolved human approver in that GitHub thread. If identity or intent is ambiguous, stop and ask in the channel appropriate to the authorization state.
- Never auto-merge, close, release, tag, or change the requested scope. End with a review-ready PR and report its URL. A later explicit user request is required for merge/close/release work.
- Before edits on an existing PR, check out and verify its head branch. Never push to a branch based only on a remembered branch name.

## Client invocation

Use the host agent's native skill mechanism for the upstream Spec Kit skills. In Claude Code they are normally `/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, and `/speckit-implement`; Codex and Copilot may expose them through their own skill selectors or invocation syntax. If the required skill is not discoverable in that client, stop and report the missing setup rather than simulating it.

Claude Code is the primary supported client. The workflow itself uses portable Markdown instructions and `gh`/Git; do not assume one client's subagent, background-task, or scheduler API is available in another.

## Workflow

Follow `references/flow.md` for the issue-to-PR sequence and `references/communication-protocol.md` for approval polling, identity checks, and safe posting. Those references are part of this skill and must be read before performing their corresponding steps.

The key gates are:

1. Confirm issue, repository, approver, default branch, labels, and clean worktree.
2. Check that the issue is open, eligible, and not already bound to an open PR. Preview the proposed work before applying claim labels or editing files.
3. Run Specify, Clarify, Plan, and Tasks in order. Post each artifact or question to the issue and wait for explicit approver approval before advancing. Never answer clarification questions on the approver's behalf.
4. Open a draft PR with `Closes #<issue-number>` after tasks are approved. Move further discussion to that PR.
5. Implement the approved tasks on the PR branch, run repository-defined checks, and report results. Use only the target repository's documented test commands.
6. Keep CI and review work on the verified PR branch. Read top-level comments, submitted reviews, and inline review comments/replies before acting. Do not infer approval from green CI or a non-owner comment.
7. Mark the PR ready only after implementation and checks pass. Stop before merge or close.

If a step fails, preserve the issue, branch, and PR state; report a concise failure status in the console before live-run authorization or on the active GitHub thread after authorization, then stop. Do not retry actions with external side effects blindly.
