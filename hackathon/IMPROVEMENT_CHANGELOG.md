# Improvement Changelog

This is the experiment log for the hackathon submission. Each entry records what changed, why it changed, the evidence collected, and the resulting decision.

| Stage                      | What was tried and why                                                                                                                                                       | Evidence                                                                                                            | Decision                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Pre-hackathon company work | Built Slack-to-GitHub execution, Codex/Gemini selection, repository preflight, status reporting, requester retry/cancellation, health probes, and provider-failure diagnosis | Existing commits through `421e8bf`; 38 tests after branch integration                                               | Keep as the real product baseline rather than presenting existing work as a hackathon addition                     |
| Baseline hardening         | Audited the merged lifecycle and guarded cancelled tasks against late completion, failure, clarification, and PR events                                                      | Regression tests added in `63ff730`; suite increased from 38 to 40 passing tests                                    | Keep; cancellation must be a terminal state                                                                        |
| Evaluation design          | Declared ten synthetic cases and acceptance criteria before running either workflow                                                                                          | Case schema and fixtures in `7bd9369`                                                                               | Keep fixed for baseline/final comparison                                                                           |
| Evaluation tooling         | Added strict evidence scoring, manifest validation, JSON summaries, and Markdown reports                                                                                     | Commits `e4b0734` and `dbc1f6f`; evaluation tests increase the full suite to 45 passing tests                       | Keep; missing evidence must score as failure                                                                       |
| Iteration 1                | Added a provider-neutral read-only planner, structured acceptance criteria, clarification/rejection gates, Slack plan progress, and planner evidence in PRs                  | Commits `cdcde8c` through `df067bb`; workflow copies stay synchronized; suite increased from 45 to 49 passing tests | Implemented; retain for controlled evaluation, but do not claim improvement until baseline/final runs are complete |
| Iteration 2                | Add independent verification and evidence reporting                                                                                                                          | Pending                                                                                                             | Pending                                                                                                            |
| Iteration 3                | Add bounded repair attempts after actionable verification failures                                                                                                           | Pending                                                                                                             | Pending                                                                                                            |
| Iteration 4                | Add human approval and clearer Slack progress reporting                                                                                                                      | Pending                                                                                                             | Pending                                                                                                            |
| Final                      | Combine only changes that improve the primary metric                                                                                                                         | Pending                                                                                                             | Pending                                                                                                            |

## Current baseline

The baseline application is pinned to `63ff730`. It accepts an explicit repository and task from Slack, preflights the repository, creates a GitHub issue, runs Codex or Gemini, reports progress and failures, handles clarification, requester-only retry and cancellation, and returns a human-reviewed pull request to the original Slack thread. It never merges automatically.

The baseline does not have a separate planner, independent verifier, or verification-driven repair loop. Evaluation tooling added after `63ff730` measures the workflow but does not improve its agent capabilities.

The current candidate workflow now has the planner described in Iteration 1. It remains distinct from the pinned baseline and has not yet replaced it in the results table.

## Work attribution

The reliability and Gemini feature branches were created before this hackathon improvement effort and were merged into `PRobe` in `cbb43f2`. Hackathon-specific work starts with the isolated documentation in `1018e78`, followed by the cancellation audit fix and evaluation infrastructure. This distinction will remain visible in the final submission.

## Main failure mode

The integration audit already found one concrete orchestration failure: cancellation was recorded locally, but late provider webhooks could overwrite it with `completed`, `failed`, or `pr_created`. Commit `63ff730` made cancellation terminal and added regression tests. The primary model-quality failure mode remains pending the controlled baseline run.

## Hot take

Current working insight: orchestration reliability depends as much on monotonic state transitions as on model quality. A capable coding agent is still unsafe if an out-of-order event can reverse a human cancellation. The final hot take will be updated after baseline and final results are available.
