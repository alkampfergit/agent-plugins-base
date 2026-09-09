# Check Diagnosis

For raw `gh` syntax (checks, runs, jobs, APIs) see `gh-cli-guide/SKILL.md` →
**Checks & workflow runs**, **Code scanning & standalone security checks**.
This file covers the diagnostic flow.

## Inspect the current check cycle

Fetch the structured status once via
`gh pr checks "$PR_NUMBER" --json name,state,link,workflow,bucket` and/or
`gh pr view "$PR_NUMBER" --json statusCheckRollup`.

In one-pass mode, diagnose terminal failures visible in that snapshot. If
checks are pending, report them and end the invocation. Only when the user
explicitly requested monitoring, run
`gh pr checks "$PR_NUMBER" --watch --fail-fast` before fetching a fresh
structured snapshot.

Treat these cases differently:

- `SonarCloud Code Analysis` failed or Sonar reports open issues for the PR
- GitHub Actions job failed and the link contains `/actions/runs/<run>/job/<job>`
- A standalone security check failed with no workflow name, such as `CodeQL`

## Sonar path

If Sonar is failing, or if the user explicitly wants Sonar issues fixed, load
the `sonarcloud` skill (`github-alk/skills/sonarcloud/SKILL.md`) and follow
its **Diagnose Quality Gate** and **Fix Issues Workflow** sections.

Preferred query (no auth needed for public projects):

```bash
curl -s "https://sonarcloud.io/api/issues/search?componentKeys=<owner>_<repo>&pullRequest=$PR_NUMBER&statuses=OPEN,CONFIRMED&ps=50"
```

Fall back to the GitHub check-run summary if the API call fails — note the
SonarCloud GitHub App slug is `sonarqubecloud`, not `sonarcloud`:

```bash
gh api repos/<owner>/<repo>/commits/<sha>/check-runs \
  --jq '.check_runs[] | select(.app.slug == "sonarqubecloud") | {name, conclusion, summary: .output.summary}'
```

Use the returned issue list as the fix target inventory. Sonar may be green
even when other GitHub checks still fail, so do not stop after a green Sonar
result. A green Sonar check also does not mean every new-code issue is fixed
— target zero open new-code issues, not just a passing gate (see
`sonarcloud/SKILL.md` → **Goal: zero new issues on the PR**). Resolve the
project key per `sonarcloud/SKILL.md` → **Resolve the project key**; ask the
user if it cannot be determined from repo context (see `SKILL.md` → Inputs
and assumptions).

## Failed GitHub Actions job path

For a failed check whose link contains a workflow run and job:

1. Extract the run ID and job ID from the link.
2. View the failing steps first (`gh run view ... --log-failed`).
3. Fall back to the full log only if needed.

See gh-cli-guide → **Checks & workflow runs → Runs & failing jobs** for the
exact command forms.

Name the failure mode before fixing it. Prefer a minimal root-cause fix over
re-running a job unchanged.

## Standalone security check path

For standalone checks such as `CodeQL`, load
`references/standalone-security-checks.md`.
