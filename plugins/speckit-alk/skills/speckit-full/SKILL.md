---
name: speckit-full
description: Discover GitHub issues carrying a user-selected label and drive eligible issues through the human-approved Spec Kit workflow. Use when asked to poll a Spec Kit backlog, process labeled issues, or run a bounded issue cycle.
compatibility: Requires gh, Git, a Spec Kit-initialized target repository, and explicit authorization before live cycles or recurring schedules.
metadata:
  author: alkampfer
  plugin: speckit-alk
---

# speckit-full — bounded, label-driven issue processing

Discover issues with a caller-selected label and delegate one eligible issue at a time to this plugin's `speckit-gh` workflow. Every spec phase remains human-approved. This skill does not contain or replace upstream Spec Kit skills.

## Inputs

Required: `label=<ready-label>`.

Optional: `repo=<owner/name>` (default the current repository), `mode=preview|once|loop`, `interval=<duration>`, `max-per-cycle=<N>` (default 1, hard maximum 3), `claim-label=in-progress`, `poll-seconds=60`, `approval-timeout-minutes=60`. The claim label must already exist; this skill applies it only while an issue is actively being processed and removes it after verifying the linked PR.

Ask for any missing repository or label. Do not infer a label or select another repository.

## Read-only preview (`mode=preview`)

Run `gh auth status`, confirm the current repo/branch and clean worktree, then list open issues matching the exact label with `gh issue list --repo <owner/name> --label <label> --state open --json number,title,url,labels,assignees,createdAt`. Re-fetch each candidate and skip issues with an active claim or an open linked PR. Show the eligible issues in oldest-first order, the configured per-cycle limit, and any unmet prerequisites. Do not add labels, assign, comment, create branches, or invoke `speckit-gh` in preview mode. Ask the user to authorize a specific `once` cycle or a bounded recurring `loop` after showing this result.

## Safety and prerequisites

- Start each new configuration with a read-only `preview`. A live `once` cycle requires the user's explicit authorization of the resolved repository, label, issue limit, and write actions. A recurring `loop` additionally requires explicit scheduling approval. That authorization permits bounded issue processing only; `speckit-gh` still waits for human approval at every Spec Kit gate. A previously approved loop may continue only with the exact approved scope; ask again if its repository, label, interval, or limit changes.
- Require `gh auth status`, correct repository scope, a clean worktree on the verified default branch, initialized `.specify/` and upstream Spec Kit skills, a resolved human approver, and a usable test toolchain. If any precondition fails, report and stop.
- Exclude issues carrying `claim-label`, closed issues, and issues already linked to an open PR. Skip release-labeled issues; release operations are outside this plugin.
- Process at most one issue per cycle by default and never more than three; if a larger batch is requested, ask the user to split it into separately authorized bounded runs. Stop the cycle on the first delegated failure.
- Never auto-repair a dirty tree, commit unrelated work, merge/close a PR, create a release/tag, or change the requested repository/scope.
- All approvals must come from the resolved human approver in the GitHub thread. Bots and non-approver comments are not approval.

## One live cycle (`mode=once`)

1. Re-fetch the repo and issue list; do not trust a prior preview for current state.
2. Select oldest eligible issue first, unless the repository uses explicit priority labels; apply only a documented priority order.
3. Before starting each issue, check that no open PR already closes it. If one exists, report it and skip without changing labels.
4. Pass the selected issue, repository, claim label, and live-cycle authorization to this plugin's `speckit-gh` workflow using the host client's native mechanism; in Claude Code, plugin skills are namespaced (for example `/speckit-alk:speckit-gh`). `speckit-gh` must re-fetch eligibility and own the claim-label write; do not claim twice. If the client cannot invoke a sibling/plugin skill, stop rather than pretending it ran.
5. On success, report the verified PR URL. On failure, stop the cycle and report the current issue/PR state. Do not continue through a backlog of failures.

## Repeated polling

Claude Code is the primary client. Use its built-in `/loop` or scheduled-task capability only when it is available, with a bounded interval, and after the user explicitly approves a recurring schedule. Tell the user that session schedules are not permanent and can expire; never describe them as an always-on service. Before each scheduled live cycle, run the normal preconditions again.

Codex and Copilot support the portable single-cycle skill, but their scheduling and subagent interfaces are not assumed to match Claude's. For those clients, use `mode=once` and let an explicitly configured external scheduler invoke a fresh cycle. If repeated scheduling is unavailable or unauthorized, stop after the preview or single cycle.

## Startup checklist

For a first run, show the resolved repo, label, issue candidates, max-per-cycle, and schedule mode. Wait for authorization before starting a live cycle or creating a recurring schedule. Keep every run bounded and report the PR URL or exact blocker.
