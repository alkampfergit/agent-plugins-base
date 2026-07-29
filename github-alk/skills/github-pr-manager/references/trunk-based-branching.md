# Trunk-Based Branching

This skill assumes the repository follows trunk-based development: one
long-lived trunk (`master` or `main`), everything else is a short-lived
branch that merges back within days, not weeks. Use this file to decide how
to branch, rebase, and clean up — for raw `gh` / `git` syntax see
`gh-cli-guide/SKILL.md`.

## The trunk is the only long-lived branch

- `master`/`main` is always releasable. There is no persistent `develop`,
  `staging`, or `integration` branch to target instead.
- Every feature/fix branch is cut directly from the trunk and targets the
  trunk as its PR base. Do not invent an intermediate integration branch —
  see `references/open-pr.md` step 3 for how the base branch is verified.
- Confirm there really is no long-lived integration branch before assuming
  trunk-based flow: check `gh repo view --json defaultBranchRef` and
  `git branch -r`. If the repository already has a `develop`-style branch in
  active use, that is the repo's actual trunk for PR purposes — do not
  fight the existing convention.

## Branches stay short-lived

- Cut a branch, make the change, open the PR, get it green, merge, delete —
  aim for the branch to exist for a single working session or a few days at
  most. The longer a branch lives, the more it drifts from the trunk and the
  more expensive the eventual rebase becomes.
- Prefer small, frequent PRs over one large PR. A branch that is
  accumulating unrelated commits because "might as well bundle it" is a
  signal to split it instead.
- If a branch has been open for a long time and diverged significantly, flag
  this to the user before continuing — a large rebase or merge conflict at
  closure time is a symptom of the branch living too long, not something to
  silently push through.

## Stay current with rebase, not merge

- To pull trunk changes into a feature branch, rebase onto the trunk. Do not
  merge the trunk into the feature branch — that creates a merge commit on a
  branch that is supposed to disappear, and defeats the fast-forward-only
  policy used at closure (see `references/release-closure.md` step 4).

  ```bash
  git fetch origin
  git rebase origin/master
  git push --force-with-lease
  ```

- Only rebase when the branch is actually behind (`git log --oneline
  HEAD..origin/master`). Do not rebase for its own sake — see
  `references/release-closure.md` step 2, which already applies this rule at
  closure time.
- Always use `--force-with-lease`, never bare `--force`, so a push does not
  silently clobber commits someone else added to the same branch.

## Merge to trunk fast-forward only

- The trunk never receives a merge commit from this skill's flows. Every
  merge to `master`/`main` is a fast-forward
  (`git merge --ff-only`), which is only possible because the branch was
  kept current via rebase (previous section). This is already the mechanic
  `references/release-closure.md` step 4 implements — this file explains the
  *why* so the same discipline applies to any branch, not just release
  branches.
- If `--ff-only` fails, the branch is behind or has diverged again — rebase
  and retry. Never fall back to a merge commit to force it through.

## Delete the branch immediately after merge

- A merged branch has no further purpose in trunk-based development. Delete
  both the local and remote copies as part of closing out the work, not as a
  separate cleanup pass later:

  ```bash
  git branch -d "$HEAD_BRANCH"
  git push origin --delete "$HEAD_BRANCH"
  ```

- If local deletion fails because the branch is "not fully merged" locally,
  stop and explain rather than forcing it (`-D`) — that error means the
  local view of the branch is missing commits that made it to the trunk by
  another path (e.g. squash-merge), and force-deleting could lose work that
  was never actually observed as merged from this machine.

## Avoid stacking PRs; if unavoidable, rebase every dependent

- Prefer landing one PR on the trunk before starting the next, even if it
  means waiting for CI/review. Stacking (branch B built on top of still-open
  branch A) reintroduces the long-lived-integration-branch problem one level
  down, and multiplies rebase cost every time A changes.
- If the user explicitly wants a stack:
  - Each dependent branch's PR base is the branch below it, not the trunk,
    until that lower branch merges.
  - When a lower branch in the stack is rebased or merged, every dependent
    branch above it must be rebased in turn, in order, bottom to top. Do not
    rebase a dependent onto the trunk until every branch below it in the
    stack has actually merged.
  - After the bottom-most branch merges to the trunk, re-target the next
    branch's PR base to the trunk and rebase it onto the trunk directly —
    do not leave it based on a now-deleted branch.
  - Flag to the user when a stack exceeds two or three levels — at that
    depth the rebase cascade cost usually outweighs whatever motivated the
    stacking.

## Release branches are a short-lived, controlled exception

- `release/<semver>` branches (see `references/release-closure.md`) are the
  one branch type in this flow that is intentionally cut for a specific
  purpose other than a single feature/fix, but they follow the same
  trunk-based discipline, not a parallel release-train model:
  - Cut from the trunk at the point release stabilization begins, not from
    an older commit.
  - Only stabilization fixes land on it — no unrelated feature work.
  - It closes via the same fast-forward-only merge and immediate branch
    deletion as any other branch (`references/release-closure.md` step 4),
    not a long-lived branch that survives past its own release.
  - It does not become the base for other branches' PRs. If work needs to
    continue in parallel, it continues against the trunk, not against the
    release branch.
