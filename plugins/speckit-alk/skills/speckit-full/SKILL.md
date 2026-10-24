---
name: speckit-full
description: Discover GitHub issues carrying a user-selected label and drive eligible issues through the human-approved Spec Kit workflow, exchanging every instruction with the conductor on a GitHub control issue. Use when asked to poll a Spec Kit backlog, process labeled issues, or run a bounded issue cycle.
compatibility: Requires gh, Git, a Spec Kit-initialized target repository, an open control issue, and explicit conductor authorization on GitHub before live cycles or recurring schedules.
metadata:
  author: alkampfer
  plugin: speckit-alk
---

# speckit-full — bounded, label-driven issue processing

Discover issues with a caller-selected label and delegate one eligible issue at a time to this plugin's `speckit-gh` workflow. Every spec phase remains human-approved. This skill does not contain or replace upstream Spec Kit skills.

## Inputs

Required: `label=<ready-label>` and `control-issue=<N>`, an existing open issue in the target repository that serves as the conductor thread.

Optional: `repo=<owner/name>` (default the current repository), `conductor=<login>` (required for organization-owned repositories), `mode=preview|once|loop`, `interval=<duration>`, `max-per-cycle=<N>` (default 1, hard maximum 3), `claim-label=in-progress`, `poll-seconds=60`, `approval-timeout-minutes=60`. The claim label must already exist; this skill applies it only while an issue is actively being processed and removes it after verifying the linked PR.

If the repository, label, or control issue is missing, report that in the console and stop. Do not infer a label, select another repository, or create a control issue.

## GitHub is the only conductor channel

The conductor is the human who drives this skill. Every exchange with the conductor — preflight blockers, questions, the preview, authorization, scope changes, cycle status, and stop requests — happens on GitHub: on the control issue for cycle-level work, and on the active issue or PR once `speckit-gh` takes over. Do not ask the conductor anything in the console and do not accept console replies as instructions or consent; the console invocation only starts the skill.

The console is used only to report that GitHub itself cannot be reached: `gh` is unauthenticated, the repository or control issue cannot be read, or the control issue is closed. In that case print the exact blocker and stop.

Follow `../speckit-gh/references/communication-protocol.md` for comment markers, watermarks, and safe posting. Use the `preview`, `status`, `approval`, and `failure` marker kinds on the control issue.

### Resolve the conductor

```bash
gh api "repos/$repo" --jq '.owner.type, .owner.login'
gh api "users/$conductor" --jq .type
gh api "repos/$repo/collaborators/$conductor/permission" --jq .permission
```

For a `User`-owned repository the conductor is the owner login. For an `Organization`-owned repository the `conductor` input is required; verify the account type is `User` (not `Bot`) and its permission is `admin`, `maintain`, or `write`. The authenticated `gh` login is the actor identity and is never the conductor unless it is the personal repository's owner. If the conductor cannot be resolved, post the blocker on the control issue (when readable) and stop.

The conductor is also the resolved human approver passed to `speckit-gh`.

### Posting and reading conductor instructions

Post with a body file so Markdown is preserved, and keep the GitHub-returned timestamp as the watermark:

```bash
gh api "repos/$repo/issues/$control_issue/comments" -F body=@"$body_file" \
  --jq '{id: .id, url: .html_url, created_at: .created_at}'
```

Poll for conductor replies newer than the watermark, reading every page:

```bash
gh api --paginate "repos/$repo/issues/$control_issue/comments?since=$watermark&per_page=100" \
  | jq -s --arg who "$conductor" --arg wm "$watermark" \
      'add // [] | map(select(.user.login == $who and .created_at > $wm))'
```

Only new comments authored by the conductor count; ignore edits to older comments, reactions, bots, and other users. Recognize these replies:

- `approve <revision>` — authorizes exactly the posted preview revision.
- `stop` — end the current run or loop after the in-flight step reaches a safe state; do not start another issue.
- Anything else is feedback or a scope change: apply it by posting a new preview revision and requesting fresh approval. If intent is ambiguous, ask on the control issue and wait.

Wait at most `approval-timeout-minutes`, polling every `poll-seconds`. On timeout post a timeout status and stop; silence is never consent.

## Read-only preview (`mode=preview`)

Run `gh auth status`, confirm the current repo/branch and clean worktree, resolve the conductor, then perform complete discovery below. Post one `preview` comment on the control issue containing: the resolved repo, label, conductor, all eligible issues in the resulting order, the per-cycle limit and selected issues, the proposed mode and interval, any unmet prerequisites, and a revision identifier (for example a hash of that content). Read the comment back to confirm it posted.

Apart from that preview comment, do not add labels, assign, comment elsewhere, create branches, or invoke `speckit-gh`. End the preview by asking on the control issue for the conductor to reply `approve <revision>` for a specific `once` cycle or bounded `loop`.

### Complete discovery (preview and every live cycle)

Fetch all pages of open repository issues before filtering or selecting. With `repo` set to the verified `owner/name` and `issues_file` to a temporary file:

```bash
gh api --method GET "repos/$repo/issues" \
  -f state=open -f sort=created -f direction=asc -f per_page=100 \
  --paginate > "$issues_file"
```

Require a successful exit and complete pagination before consuming the file. On any page failure, discard the partial candidate set and stop; do not report an empty backlog or start an issue from incomplete results. Do not substitute `gh issue list`'s default window, a fixed large `--limit`, or a capped search result.

Parse the successive JSON page arrays (for example with `jq -s 'add // []'`), flatten them, exclude entries with `pull_request` (this endpoint also returns PRs), exclude the control issue, deduplicate by issue number, and match the caller's label exactly against `labels[].name`. Local label matching also preserves labels containing commas. Re-fetch each matching candidate and verify it is still open and still carries the label; exclude active claims, release-labeled issues, and issues linked to an open PR. Complete any pagination needed for eligibility checks too.

Only after the full eligible set is known, sort by `created_at` ascending with issue number as a deterministic tie-breaker. If the repository documents priority labels, apply that documented priority order first and oldest-first within each priority. Then apply `max-per-cycle` (default 1, maximum 3). Use this same discovery, eligibility, ordering, and limit sequence for preview and live cycles.

## Safety and prerequisites

- Start each new configuration with a read-only `preview`. A live `once` cycle requires the conductor's `approve <revision>` reply on the control issue for a preview that names the repository, label, issue limit, and write actions. A recurring `loop` additionally requires the approved preview to state the interval and recurrence. That authorization permits bounded issue processing only; `speckit-gh` still waits for the conductor's approval at every Spec Kit gate. A previously approved configuration may continue only with the exact approved scope and only while no later conductor `stop` exists; post a new preview if its repository, label, interval, or limit changes.
- Require `gh auth status`, correct repository scope, an open control issue, a clean worktree on the verified default branch, initialized `.specify/` and upstream Spec Kit skills, a resolved conductor, and a usable test toolchain. If any precondition fails, post the blocker on the control issue and stop (console only when GitHub is unreachable).
- Exclude issues carrying `claim-label`, closed issues, and issues already linked to an open PR. Skip release-labeled issues; release operations are outside this plugin.
- Process at most one issue per cycle by default and never more than three; if a larger batch is requested, ask the conductor on the control issue to split it into separately authorized bounded runs. Stop the cycle on the first delegated failure.
- Never auto-repair a dirty tree, commit unrelated work, merge/close a PR, create a release/tag, or change the requested repository/scope.
- Bots, the automation account, non-conductor comments, reactions, and console messages are never authorization or gate approval.

## One live cycle (`mode=once`)

1. Re-read the control issue since the last processed conductor comment. Stop if the conductor posted `stop`; post a new preview if the conductor changed scope. Confirm the approval comment for the current revision is present.
2. Re-fetch the repo and run complete discovery above, including every issue page and eligibility check; do not trust a prior preview for current state.
3. Sort the complete eligible set as described above, then select at most `max-per-cycle` issues. Never apply the cycle limit to raw pages or before eligibility filtering. Post a `status` comment on the control issue naming the selected issues.
4. Before starting each issue, check that no open PR already closes it. If one exists, note it on the control issue and skip without changing labels.
5. Pass the selected issue, repository, claim label, conductor login as the resolved approver, and the URL of the conductor's approval comment as live-cycle authorization to this plugin's `speckit-gh` workflow using the host client's native mechanism; in Claude Code, plugin skills are namespaced (for example `/speckit-alk:speckit-gh`). `speckit-gh` must re-fetch eligibility and own the claim-label write; do not claim twice. If the client cannot invoke a sibling/plugin skill, post that blocker on the control issue and stop rather than pretending it ran.
6. On success, post the verified PR URL on the control issue. On failure, post a `failure` comment with the current issue/PR state and stop the cycle. Do not continue through a backlog of failures.

## Repeated polling

Claude Code is the primary client. Use its built-in `/loop` or scheduled-task capability only when it is available, with a bounded interval, and after the conductor approved a preview that states the recurring schedule. State in that preview that session schedules are not permanent and can expire; never describe them as an always-on service. Before each scheduled live cycle, run the normal preconditions again and re-read the control issue for `stop` or scope changes.

Codex and Copilot support the portable single-cycle skill, but their scheduling and subagent interfaces are not assumed to match Claude's. For those clients, use `mode=once` and let an explicitly configured external scheduler invoke a fresh cycle; each invocation re-reads the control issue and runs only under an approved, unrevoked revision. If repeated scheduling is unavailable or unauthorized, stop after the preview or single cycle.

## Startup checklist

For a first run, post on the control issue the resolved repo, label, conductor, issue candidates, max-per-cycle, and schedule mode. Wait for the conductor's approval there before starting a live cycle or creating a recurring schedule. Keep every run bounded and post the PR URL or exact blocker on the control issue.
