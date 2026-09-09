# Reference: Addressing reviewer comments

Use this workflow when the PR is already green on CI and the remaining work
is responding to feedback from a **reviewer** — either a human reviewer or
an automated reviewer like Copilot Pull Request Reviewer.

This is a distinct phase from the `fix-loop` (which addresses failing
checks). Reviewer comments may point out:

- Real defects that the automated gates did not catch.
- Missing edge-case handling, cleanup paths, docstring drift.
- Typos, grammar, clarity.
- Design concerns ("consider racing X against Y", "release Z earlier").

Handle this phase after `fix-loop` has run and before any release-closure
step. Never merge a PR while unresolved reviewer comments exist unless the
user explicitly tells you to.

For raw `gh api` syntax (requested reviewers, reviews, line-level comments,
issue comments, polling template) see `gh-cli-guide/SKILL.md` →
**Reviews & reviewer comments**. This file covers the decision flow.

## Step 1: Detect requested reviewers

Query `requested_reviewers` via the API (see gh-cli-guide). If the output
contains `Copilot` (or any other reviewer), a review has been requested but
not yet submitted.

`gh pr view` alone may under-report pending reviewer requests, especially for
GitHub Apps — always cross-check with the API endpoint.

## Step 2: Inspect review state; wait only when requested

Query `requested_reviewers` and `/pulls/<N>/reviews` once. If the reviewer is
still pending, report that state and end the invocation.

Only when the user explicitly asks to wait, watch, monitor, or poll, continue
until the reviewer disappears from `requested_reviewers` **AND** their review
shows up under `/pulls/<N>/reviews`, or until a reasonable deadline (Copilot
typically takes 2–5 minutes for a medium-sized PR; 10 minutes is a safe upper
bound). Use the opt-in polling template in gh-cli-guide → **Reviews & reviewer
comments → Inspect or poll for a pending review**.

Note: Copilot may post a `COMMENTED` review (no explicit approve/request
changes). An empty filtered `reviews` count combined with the reviewer having
left `requested_reviewers` usually means the review DID land — re-check using
the unfiltered review listing.

## Step 3: Collect every comment surface

A GitHub review has three surfaces; you must inspect all three (review bodies,
line-level review comments, top-level issue comments on the PR). See
gh-cli-guide → **Reviews & reviewer comments → Review bodies & line-level comments**
for the three `gh api` calls.

Present the comments to the user categorised by file and by nature (real
defect / style / doc / typo). Call out comments that are **outside the PR's
scope** (for example, pre-existing modifications on the branch that this PR
did not introduce) — the user may want to skip those.

## Step 4: Fix in a dedicated round

Each round of reviewer-comment fixes follows the same shape as `fix-loop`:

1. **Triage**: classify each comment. Plan the smallest diff that addresses
   each actionable item.
2. **Apply**: make the changes. Keep the edits scoped to what the reviewer
   raised; resist expanding scope.
3. **Validate locally**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
4. **Commit and push** one commit per round. Conventional prefix:
   `fix(review): address Copilot review comments (round N)` or similar.
5. **Post a PR comment** mirroring the `fix-loop` audit trail, but labeled
   as reviewer-comment work — list each addressed comment with a 1-line
   summary and the fix location. Example:

   ```
   ## Reviewer-comment round 1

   Addressing feedback from @Copilot on review <review-id>:

   - `register_execute_routes.ts:181` — free the pending-store slot as soon
     as the approval decision lands, so DUPLICATE_IN_FLIGHT only gates
     awaiting-approval duplicates. Added `PendingRequestStore.release`.
   - `AGENTS.md:33` — fixed typo / grammar in the semver rule.

   **Commit:** `<sha>` — <commit message>
   **Local validation:** lint ✓ | test ✓ | build ✓
   ```

6. **Refresh checks once**. Pushing a new commit re-triggers CI and may cause a
   re-review. Report pending state and return unless monitoring was explicitly
   requested; only then use watch mode.

## Stop conditions

Stop reviewer-comment work when one of:

- Every comment is either addressed with a code/doc change, or explicitly
  marked as "out of scope / won't fix" with reasoning captured in the PR
  comment.
- One reviewer-comment round has completed in one-pass mode.
- The user says stop.
- Five reviewer-comment rounds have been attempted in explicitly requested
  monitoring mode (mirrors the `fix-loop` budget). After exhausting the budget,
  do not resume automatically; wait for an explicit user instruction to take
  another pass.

When stopping, report:

- Which comments were addressed (and how)
- Which were deferred (and why)
- Any comment that could not be addressed within the round budget
- The PR URL so the user can verify before merging

## Guardrails

- Never silently close or dismiss reviewer comments via the API. Always
  leave an explanatory PR comment.
- Never merge while reviewer comments are unresolved unless the user
  explicitly authorises it.
- Comments on files that this PR did not introduce (e.g., typos on a
  branch but in lines that predate the PR) should still be flagged to the
  user — but let the user decide whether to fix them here or open a
  separate PR.
- In monitoring mode, if Copilot's review times out or never arrives, report
  that fact instead of silently proceeding. In one-pass mode, simply report
  that the review is still pending.
