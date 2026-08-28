# Baseline Execution Protocol

This protocol makes baseline runs repeatable and comparable with the final workflow. Complete the run manifest before executing the first case and do not change its controlled settings during a comparison run.

## 1. Controlled conditions

Use these conditions for both baseline and final runs:

- the same evaluation case definitions;
- the same disposable target repository and starting commit;
- the same provider, model, credentials tier, and provider settings;
- the same GitHub Actions runner type;
- the same 60-minute maximum runtime per attempt;
- the same repository instructions and validation commands; and
- the same evidence and scoring rules.

The baseline application behavior is pinned to commit `63ff730`. Evaluation tooling added after that commit does not count as an agent capability.

Record any unavoidable difference in the manifest and discuss its likely effect. Do not silently rerun only failed cases with better resources.

## 2. Safe evaluation environment

Use a disposable repository or approved evaluation fork containing synthetic data only. Install the Slack coding-agent workflow and repository instructions exactly as documented. Store provider credentials only as GitHub Actions secrets.

Do not use a production repository, customer data, company credentials, or private Slack conversations in submitted evidence. The workflow must continue to require human review and must never merge automatically.

## 3. Run manifest

Copy `run-manifest.example.json` into the ignored `hackathon/results/` directory and name it for the run, for example `baseline-manifest.json`. Fill every placeholder before starting.

Record:

- source commit and case-file commit;
- provider and exact model when the provider exposes it;
- runner and Node.js versions;
- UTC start time;
- maximum attempts and timeout;
- pricing or free-tier assumptions; and
- sanitized target-repository identity.

The baseline allows one provider attempt per case. A requester-initiated retry is evaluated only in the dedicated retry case; it is not used to improve unrelated baseline results.

## 4. Case execution

Run cases in the order stored in `cases.json`.

For each case:

1. Restore the disposable target repository to the recorded starting commit.
2. Confirm there is no active issue, branch, or pull request from an earlier case.
3. Submit the exact `request` text through Slack without extra hints.
4. Start the timer when Slack accepts the request.
5. Follow only the interaction allowed by the case. For clarification cases, provide a predefined synthetic answer and record it.
6. Stop the timer when the workflow reaches its expected terminal state or the 60-minute limit.
7. Run every command listed in `requiredChecks` against the resulting checkout when applicable.
8. Record the observed outcome, acceptance evidence, check evidence, repository-change flag, attempt count, human minutes, estimated cost, and notes.
9. Preserve redacted links or excerpts needed to reproduce the score.

Do not repair a baseline result manually. A human correction makes that case unsuccessful for verified completion and should be recorded in the notes.

## 5. Evidence standard

Each acceptance criterion needs specific evidence, such as:

- a file and line reference;
- a test name and command result;
- a GitHub issue comment with an explicit marker;
- a task status transition;
- a pull-request link; or
- a Slack thread event with identifying data redacted.

Statements such as "looks correct" or "the agent said it passed" are not evidence. Required command evidence must include the command, exit status, and concise result summary.

## 6. Time and cost

Measure elapsed workflow time automatically when timestamps are available. Record active human time separately; waiting for the provider or GitHub Actions is not human time.

Estimate provider cost from recorded token usage and the provider price in effect on the run date. If exact usage is unavailable, record the case cost as an estimate and explain the calculation. Free-tier execution still records estimated market cost when possible so comparisons remain meaningful.

## 7. Redaction

Before sharing evidence, remove:

- API keys, tokens, private keys, cookies, and authorization headers;
- Slack workspace, channel, thread, and user identifiers;
- private repository names and installation identifiers;
- database URLs and provider project identifiers; and
- customer, employee, or proprietary source data.

Keep enough stable synthetic identifiers to connect each trajectory to its evaluation case. Never commit raw logs, `.env` files, SQLite files, or generated result files.

## 8. Score and preserve results

Generate the observation file once:

```text
npm run evaluate:baseline -- init
```

Fill it as cases finish, then calculate the summary:

```text
npm run evaluate:baseline
```

Review and redact the ignored result files before copying selected evidence into a tracked submission document. Report all ten case outcomes, including failures and timeouts.
