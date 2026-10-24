# GitHub communication and approval protocol

Every approval poll and comment in `speckit-gh` must follow this protocol.

## Markers and channels

Prefix each bot comment with a unique marker:

```text
<!-- speckit-alk:<kind>:<uuid> -->
```

Use `status`, `question`, `approval`, `spec`, `plan`, `tasks`, `handoff`, or `failure` for `<kind>`. Use the issue thread through Specify/Clarify/Plan/Tasks. Once the draft PR is opened, use the PR thread for implementation, CI, and review. Post one handoff pointer on the issue.

## Approver identity

Resolve the authorized human before asking for or accepting approval. For a personal repository, use its owner login. For an organization repository, require the user to identify a human maintainer. The `gh` login is the actor/tool identity, not proof that the actor is the human approver. Never accept a bot's own comment, a reaction, a reviewer's approval, or a non-approver's reply as a gate decision.

If the approver cannot be resolved, stop without taking the next state-changing step. If a comment's author or intent is ambiguous, ask the user rather than guessing.

## Polling and watermark

After posting a question or approval request, capture the GitHub-returned `createdAt` timestamp and use it as the watermark. Poll for a newer comment authored by the resolved approver; never use local wall-clock time as the watermark. Before every post, re-fetch the active thread and process new approver feedback first.

Use a bounded timeout. If no authorized response arrives, leave the work intact, post a timeout status, and stop. Do not treat silence as approval.

For PR feedback, inspect all three streams:

```bash
gh pr view <PR> --repo <owner/repo> --json comments,reviews
 gh api repos/<owner>/<repo>/pulls/<PR>/comments
```

The second command returns inline review comments; include replies/threads where available. A successful top-level comment scan alone is not a complete review sweep.

## Safe posting

- Re-fetch the issue/PR immediately after any long test, wait, or delegated action and before posting.
- Keep comments short, factual, and linked to actual artifacts or check output.
- Do not post secrets, credentials, or unredacted logs.
- A write command's success is not proof of remote state: read back the exact issue, label, PR, review, or check before claiming it succeeded.
- On cancellation, stop polling. Do not remove labels, close issues, close PRs, or delete branches unless explicitly requested.
