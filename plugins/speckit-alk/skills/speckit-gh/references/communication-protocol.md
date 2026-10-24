# GitHub communication and approval protocol

Every approval poll and comment in `speckit-gh` must follow this protocol.

## Markers and channels

Before standalone live-run authorization, use the console for preflight questions and blockers, the read-only preview, and initial user consent; do not post GitHub comments or make other workflow changes. After authorization, including authorization inherited from a matching approved `speckit-full` run, all workflow communication belongs only on the active GitHub issue or PR. Initial consent authorizes the live run, not any Spec Kit gate: those approvals still require the resolved human approver's explicit response in the GitHub thread.

Prefix each bot comment with a unique marker:

```text
<!-- speckit-alk:<kind>:<uuid> -->
```

Use `status`, `preview`, `question`, `approval`, `spec`, `plan`, `tasks`, `handoff`, or `failure` for `<kind>`. Use the issue thread through Specify/Clarify/Plan/Tasks. Once the draft PR is opened, use the PR thread for implementation, CI, and review. Post one handoff pointer on the issue. When run by `speckit-full`, cycle-level preview, authorization, status, and failure comments belong on its control issue.

## Approver identity

Resolve the authorized human before asking for or accepting approval. For a personal repository, use its owner login. For an organization repository, require the user to identify a human maintainer. The `gh` login is the actor/tool identity, not proof that the actor is the human approver. Never accept a bot's own comment, a reaction, a reviewer's approval, or a non-approver's reply as a gate decision.

If the approver cannot be resolved, stop without taking the next state-changing step. If a comment's author or intent is ambiguous, ask the user in the channel appropriate to the authorization state rather than guessing.

## Polling and watermark

After posting a question or approval request, capture the GitHub-returned `createdAt` timestamp and use it as the watermark. Poll for a newer comment authored by the resolved approver; never use local wall-clock time as the watermark. Before every post, re-fetch the active thread and process new approver feedback first.

Use a bounded timeout. If no authorized response arrives, leave the work intact, post a timeout status, and stop. Do not treat silence as approval.

For PR feedback, inspect all three streams:

```bash
gh pr view <PR> --repo <owner/repo> --json comments,reviews
gh api --paginate "repos/<owner>/<repo>/pulls/<PR>/comments?per_page=100"
```

The second command collects every page of inline review comments, including replies. Parse and flatten the successive JSON page arrays (for example with `jq -s 'add // []'`) and inspect every comment; retain `id` and `in_reply_to_id` to associate replies with parent threads across page boundaries. Do not filter out replies. Require successful completion of all pages before treating the sweep as complete or advancing its watermark; on a page failure, stop and report an incomplete sweep. A successful top-level comment scan alone is not a complete review sweep.

## Safe posting

- Re-fetch the issue/PR immediately after any long test, wait, or delegated action and before posting.
- Keep status comments short, factual, and linked to actual artifacts or check output. Approval artifacts must include full contents as required by the artifact publication gate in `flow.md`; do not shorten or truncate them.
- Do not post secrets, credentials, or unredacted logs.
- A write command's success is not proof of remote state: read back the exact issue, label, PR, review, or check before claiming it succeeded.
- On cancellation, stop polling. Do not remove labels, close issues, close PRs, or delete branches unless explicitly requested.
