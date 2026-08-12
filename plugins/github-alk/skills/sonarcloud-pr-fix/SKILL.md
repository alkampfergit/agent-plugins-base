---
name: sonarcloud-pr-fix
description: Use when the user wants to find SonarCloud issues for the current branch pull request, fix them in the local repo, verify with local checks, push the branch, and confirm whether SonarCloud has reanalyzed the PR.
---

# SonarCloud PR Fix

Use this skill for PR-scoped SonarCloud cleanup work in this repository.

## Goal

Find the SonarCloud issues attached to the current branch's pull request, apply the smallest safe fixes, verify locally, push the branch, and check whether SonarCloud has refreshed on the latest commit.

Target zero open new-code issues on the PR, not just a passing quality gate —
a green gate can still leave MINOR/INFO issues open on new code. Fix every
in-scope issue when feasible; for anything left open, say so explicitly in
the final report with the issue key and the reason (larger refactor needed,
suspected false positive, etc.).

## Default assumptions

- Repo root is the current working directory.
- The branch usually has an open GitHub pull request.
- Do not hardcode or assume a SonarCloud project key — resolve it per
  `sonarcloud/SKILL.md` → **Resolve the project key**, and ask the user for
  it if it cannot be determined from repo context.

## Workflow

1. Recover repo and branch context.
   - Read `AGENTS.md` and `CLAUDE.md`.
   - Run `git status --short --branch`.
   - Run `git rev-parse --abbrev-ref HEAD`.

2. Resolve the current branch to a GitHub pull request number.
   - Preferred:
     - `curl -fsSL "https://api.github.com/repos/<owner>/<repo>/pulls?state=open&head=<owner>:<branch>"`
   - Extract the PR number from the response.
   - If there is no open PR, stop and tell the user.

3. Resolve the SonarCloud project key (see `sonarcloud/SKILL.md` →
   **Resolve the project key**) — ask the user if it can't be determined
   from repo context. Reuse it for every call below.

4. Query SonarCloud for PR issues.
   - Preferred issue query:
     - `curl -fsSL "https://sonarcloud.io/api/issues/search?componentKeys=<projectKey>&pullRequest=<prNumber>&ps=100"`
   - Also check PR status when needed:
     - `curl -fsSL "https://sonarcloud.io/api/project_pull_requests/list?project=<projectKey>"`
   - Summarize findings by file, rule, and line before editing.

5. Inspect the affected code and nearby tests.
   - Read only the files touched by SonarCloud plus relevant tests.
   - Prefer targeted fixes over broad refactors.
   - Watch for CI-only failures such as `tsc --noEmit` issues that local `npm test` may miss.

6. Apply fixes.
   - Use `apply_patch` for edits.
   - Keep behavior stable unless the Sonar issue requires a behavior change.
   - Typical fixes:
     - extract helpers to reduce cognitive complexity
     - simplify negated conditions
     - replace `String#replace()` with `replaceAll()` when global replacement is intended
     - prefer `RegExp.exec()` when Sonar requests it

7. Verify locally.
   - Minimum when TypeScript code changes:
     - `npm run typecheck`
     - `npm test`
     - `npm run lint`
   - If a command fails, fix that before pushing.

8. Commit and push.
   - Use non-interactive git commands only.
   - Run:
     - `git add <files>`
     - `git commit -m "<message>"`
     - `git pull --rebase`
     - `git push`

9. Recheck remote status.
   - Confirm branch state:
     - `git status --short --branch`
   - Check GitHub checks for the pushed commit:
     - `curl -fsSL "https://api.github.com/repos/<owner>/<repo>/commits/<sha>/check-runs" -H "Accept: application/vnd.github+json"`
   - Requery SonarCloud:
     - `curl -fsSL "https://sonarcloud.io/api/project_pull_requests/list?project=<projectKey>"`
     - `curl -fsSL "https://sonarcloud.io/api/issues/search?componentKeys=<projectKey>&pullRequest=<prNumber>&ps=100"`

10. Report final state precisely.
   - Include:
     - PR number
     - files changed
     - local verification results
     - pushed commit SHA
     - whether SonarCloud has reanalyzed the latest commit yet
     - any remaining blocker outside the code changes

## Notes

- SonarCloud can lag behind GitHub pushes. If SonarCloud still shows an older `analysisDate` or commit SHA, say so explicitly instead of claiming the issues remain.
- GitHub Actions may reveal stricter typecheck failures than `npm test` if `typecheck` is not part of the test script. Always run `npm run typecheck` for TypeScript changes.
- Do not close the loop with "ready to push". Push the branch unless the user explicitly tells you not to.
