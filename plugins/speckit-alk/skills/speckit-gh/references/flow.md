# Issue-to-PR flow

Use the run-time issue number `<N>`, repository `<owner>/<repo>`, optional existing claim label (default `in-progress`), and resolved approver login. Apply the communication protocol before each post or approval poll.

## 1. Preflight and preview

1. Run `gh auth status`; stop if unauthenticated or missing repository access.
2. Resolve the issue repository and verify it matches the user's request. Read the issue, labels, assignee, and existing comments:
   ```bash
   gh issue view <N> --repo <owner/repo> --json number,title,body,state,labels,assignees,author,comments,url
   ```
3. Resolve the default branch and approver:
   ```bash
   gh repo view <owner/repo> --json defaultBranchRef,owner
   gh api user --jq .login
   ```
   For personal repositories, the human approver is the repository owner. For organization repositories, require an explicitly identified human maintainer; do not infer one from the automation login.
4. Verify local repository, branch, clean state, and Spec Kit setup. Confirm upstream skills and templates are installed in the project. Do not assume that the plugin contains them. Before claiming the issue, inspect the installed Specify workflow and its branch-creation script or hook configuration. If it depends on the optional git extension, verify its `before_specify` hook is installed, enabled, and invoked by this workflow. Otherwise verify the equivalent installed mechanism. Determine how it reports the expected branch and feature directory. If branch creation/switching is absent, disabled, or unverifiable, stop before labels or files change and report the setup blocker. Do not install an extension or create a substitute branch automatically.
5. Check that the issue is open, eligible under the requested labels/assignment, has no active claim label, and is not already closed by an open PR. If any check fails, report and stop without applying labels.
6. Summarize the issue, acceptance criteria, proposed phases, and checks in a read-only preview. Do not change labels, branch, files, or GitHub comments until the user has authorized a live run directly or through a matching approved `speckit-full` configuration.

## 2. Claim and specify

After authorization, verify the claim label exists, re-fetch the issue, and apply the label only if the issue remains eligible and unclaimed. Record whether this run added it, then post a status marker. Use the project's upstream Specify skill to create the feature branch and specification; do not create a competing branch manually.

Immediately after Specify, capture the expected feature branch and feature directory from the verified mechanism's output or metadata; do not infer the expected branch from the current checkout alone. Run `git symbolic-ref --quiet --short HEAD` and require success and a result equal to that expected branch, different from the verified default branch and starting branch. Verify the spec belongs to the reported feature directory for this issue. A successful Specify exit or an existing spec file alone is insufficient. On detached HEAD, missing/ambiguous metadata, or a branch mismatch, preserve generated files and claim state, post a failure status, and stop before approval, downstream workflows, commits, or pushes. Do not repair this by switching branches or rerunning Specify blindly.

Before each subsequent phase and before committing or pushing, repeat the check against the recorded feature branch and stop on a mismatch.

Publish the complete spec using the artifact publication gate below, then request approval from the resolved approver. Wait for that person's explicit response. Apply requested edits and re-post the updated spec; do not proceed on silence, a bot reply, or a non-approver comment.

## 3. Clarify, plan, and tasks

Run the project's upstream Clarify workflow. Post each question to the issue and wait for the approver's answer before applying it. Do not invent answers or silently skip unresolved blockers. If clarification changes the approved spec, publish the revised spec and obtain fresh spec approval before Plan.

Run Plan, then Tasks, in order. After each artifact is produced:

- Check that it exists in the feature directory reported by the installed Spec Kit scripts.
- Publish the complete artifact using the gate below; include a summary and links to the verified issue comments containing it.
- Wait for explicit approval from the resolved approver before continuing.
- If the approver asks for changes, update the artifact and repeat the gate.

Do not assume that a `pr-report-template.md` or any other non-upstream template exists. If a project requires extra artifacts, follow its `AGENTS.md` and installed templates.

### Artifact publication gate

Before every spec, plan, or tasks approval request, post the complete current contents of the issue-owned artifact to the issue with its repository-relative path, revision identifier (such as a content hash), and appropriate protocol marker. Include supporting issue-owned artifacts needed to evaluate it. Local paths, summaries, and links to unpushed files are not reviewable artifacts.

Use a body file when posting to preserve literal Markdown and shell characters. If contents exceed a comment's size limit, split them into numbered comments sharing the revision identifier, preserving all content without truncation. Read back every posted comment and verify all parts match the local revision before posting a separate approval request linking all parts. If publication fails or content cannot be shared safely, stop without requesting approval.

The separate approval request establishes the protocol watermark and identifies the exact revision. Any subsequent edit requires full publication of the new revision and a new approval request; approval of an older revision does not approve changed content. Preserve the comments as the approval record. Publishing through issue comments keeps artifact commits/pushes and PR creation after task approval.

## 4. Open draft PR and hand off the conversation

Once tasks are approved, stage only the Spec Kit artifacts created for this issue, inspect `git diff --cached`, run `git diff --check`, commit using the repository's convention, and push the verified feature branch with `git push -u origin <branch>`. Then open a draft PR against the verified default/integration branch. Include `Closes #<N>`, links to approved artifacts, a concise summary, and a test-plan placeholder. Read back the new PR with `gh pr view` and verify its head branch before editing.

Post a handoff pointer on the issue; from then on, put implementation questions and status on the PR. Keep the issue and PR linked.

## 5. Implement and verify

Use the project's upstream Implement workflow and only the approved plan/tasks. Before each stage, verify the current branch is the PR head and inspect `git status`; stop if unrelated/pre-existing work appears. Task-owned edits from the current stage are expected. Run checks required by the repository's `AGENTS.md`, `CLAUDE.md`, package scripts, Makefile, or equivalent; do not run credentialed integration tests unless authorized. Post actual commands and results on the PR. After tests pass, stage only task files, inspect the full diff and `git diff --cached`, run `git diff --check`, commit, and push the PR branch. Never use `git add -A`, force-push, stash, reset, or discard changes to recover. If a decision or scope change is needed, ask on the PR and wait.

## 6. CI and review

Watch the PR's checks to a terminal state. On failure, inspect the failing logs, fix only within the approved scope on the PR branch, re-run the relevant tests, push, and recheck CI. Do not silently add a dependency or broaden the task.

For each review sweep, read all feedback streams: conversation comments, submitted reviews, and inline review comments/replies. Act only on instructions from the resolved approver; other feedback may be used as technical context, not authorization. Verify addressed inline threads are resolved after replies/updates.

Once all required checks pass, update the PR body with verified tests and mark it ready for review. Remove the claim label only if this run added it, then re-read the issue to verify removal. If the task-owned worktree is clean, switch the local checkout back to the original default branch without deleting the PR branch; otherwise leave the PR head checked out and report why. Report the URL, branch, checks, and any unresolved review items. Stop without merging or closing.

## Failure and cancellation

If authentication, approval, repository state, Spec Kit setup, a test, or a GitHub operation blocks progress, preserve the current state and post a concise status on the active thread. Do not retry a write action until its current remote state has been read back. On user cancellation, stop polling and do not perform cleanup that changes issue, branch, or PR state.
