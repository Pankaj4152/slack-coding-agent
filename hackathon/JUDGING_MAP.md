# Judging Rubric Map

This map follows the 100-point rubric in the attached micro1 Agentic Workflows Hackathon brief. It points judges to implemented evidence and identifies items that still require controlled live runs.

| Criterion                    | Points | Submission evidence                                                                                                                                       | Status before submission                                    |
| ---------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Problem & User Value         |     15 | Root README intended-user section; hackathon README user and practical value; realistic Slack-to-PR flow                                                  | Written; validate wording with one company user             |
| Agent Solution & Engineering |     30 | Planner, verifier, repair, and approval design documents; synchronized workflow/template; strict workflow tests; no-auto-merge and cancellation contracts | Implemented; capture representative trajectories            |
| End-to-End Quality           |     20 | Slack progress markers; clarification/approval/retry/cancel controls; deterministic validation; evidence-rich PR; setup guide                             | Implemented; record one polished start-to-finish demo       |
| Measured Improvement         |     15 | Fixed ten-case suite; pinned baseline; symmetric scorers; comparison report; improvement changelog                                                        | Automation complete; controlled baseline/final runs pending |
| Reproducibility              |     15 | Setup from scratch; reproduction guide; exact npm commands; manifests; expected artifacts; Node 20 requirement                                            | Written; perform a clean-machine rehearsal                  |
| Hot Take / Insights          |      5 | Improvement changelog main failure mode and hot take, tied to cancellation race and monotonic state transitions                                           | Evidence-backed draft; finalize after live runs             |

## Ground-rule evidence

| Rule                             | How this project satisfies it                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate pre-existing work       | Baseline pin and work-attribution section distinguish company features from hackathon additions.                                                            |
| Controlled consequential actions | Agents cannot merge, deploy, or directly mutate GitHub state. Optional plan-bound approval occurs before code edits, and human PR review remains mandatory. |
| Qualified human reviewer         | Every code change ends at a pull request for human review.                                                                                                  |
| Responsible data                 | Evaluation cases are synthetic; the protocol prohibits production repositories, customer data, and private Slack evidence.                                  |
| Credentials outside submission   | Secrets remain in GitHub Actions or deployment configuration; evidence parsing rejects common credential patterns.                                          |
| Claims linked to evidence        | Case scoring requires exact, non-empty criterion/check evidence; missing cases remain pending.                                                              |
| Judge access                     | Setup and reproduction guides document clean installation, baseline/final runs, expected files, versions, timeout, and cost recording.                      |

## Highest-risk gaps

1. Do not submit without controlled baseline and final results for all ten cases.
2. Do not claim repair improvement without at least one eligible repair trajectory and measured recovery evidence.
3. Do not show private repository names, Slack identifiers, credentials, or raw logs in the video or trajectories.
4. Rehearse the complete setup from a clean environment and record actual runtime and approximate cost.
5. Keep the demo under five minutes and show one realistic execution from request through human-reviewed PR.
