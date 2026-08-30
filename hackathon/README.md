# Frontier Engineering Challenge 2026

This folder contains material prepared specifically for the micro1 Agentic Workflows Hackathon. Company-facing documentation remains in the repository root and its normal documentation locations.

## Submission thesis

Slack is where a developer request begins, but the request may be incomplete and the resulting code change needs evidence before a human reviews it. This project is evolving from a Slack-to-GitHub task handoff into a controlled workflow that plans, clarifies, implements, verifies, and reports software changes without merging automatically.

## User and practical value

The intended user is a developer or engineering lead on a small team whose requests begin in Slack. Today that person must repeatedly reconstruct intent, repository rules, validation evidence, and task status across tools. The project makes that handoff explicit and reviewable while preserving requester-only clarification, approval, retry, cancellation, and mandatory human PR review.

The baseline performs a direct coding pass after repository preflight. The candidate adds purposeful stages only where they create a safety or evidence boundary: read-only planning, trusted deterministic checks, independent read-only verification, one bounded evidence-driven repair, and optional approval bound to the exact plan. The controlled evaluation will determine whether those extra provider calls are justified by verified completion gains.

## Hackathon material

- [Improvement changelog](./IMPROVEMENT_CHANGELOG.md)
- [Evaluation plan](./EVALUATION.md)
- [Reproduction guide](./REPRODUCTION.md)
- [Agent trajectories](./AGENT_TRAJECTORIES.md)
- [Planner design](./PLANNER_DESIGN.md)
- [Verifier design](./VERIFIER_DESIGN.md)
- [Repair loop design](./REPAIR_LOOP_DESIGN.md)
- [Human approval and progress design](./HUMAN_APPROVAL_DESIGN.md)
- [Evaluation automation design](./EVALUATION_AUTOMATION_DESIGN.md)
- [Judging rubric map](./JUDGING_MAP.md)
- [Submission evidence index](./EVIDENCE_INDEX.md)
- [Final submission checklist](./SUBMISSION_CHECKLIST.md)
- [Video script](./VIDEO_SCRIPT.md)
- [Evaluation cases](./evaluation/cases.json)
- [Controlled live-run worksheet](./evaluation/LIVE_RUN_WORKSHEET.md)
- [Clean-environment rehearsal record](./CLEAN_ENVIRONMENT_REHEARSAL.md)

These documents will be updated with measured results as each implementation phase is completed. No result should be described as final until it has been reproduced using the documented commands.

Run the automated submission gate at any time:

```text
npm run submission:check
```

It writes ignored JSON and Markdown reports under `hackathon/results/`. `PENDING` means external evidence is still required; `FAIL` means a repository or evidence-integrity defect must be fixed before submission.

Generate four representative, ignored trajectory drafts after live runs begin:

```text
npm run trajectories:init
```

The generator preserves existing drafts. Redact and complete them before deliberately copying final trajectories into the tracked `hackathon/trajectories/` folder.

## Current progress

- Company feature branches have been integrated without changing the no-automatic-merge contract.
- The baseline application is pinned to commit `63ff730`.
- Ten fixed evaluation cases, evidence-based scoring, a controlled execution protocol, and report generation are implemented.
- Live baseline measurements are still pending and are not represented by fabricated values.
- A provider-neutral planner stage is implemented with clarification, rejection, cancellation, Slack progress, and PR-evidence integration.
- Controlled planner measurements and representative live trajectories are still pending.
- Independent deterministic and agent verification is implemented as a required gate before PR creation.
- Controlled verifier measurements and representative live trajectories are still pending.
- One bounded verification-driven repair attempt is implemented, including fresh deterministic checks, fresh independent verification, Slack progress, and safe stopping without automatic merge.
- Controlled repair-loop measurements and representative recovery/failure trajectories are still pending.
- Optional plan-bound requester approval and explicit coding/validation Slack progress are implemented without changing the mandatory human PR review or no-automatic-merge contract.
- Controlled end-to-end measurements remain the next submission milestone.
- Symmetric baseline/final scoring and fail-closed comparison automation are implemented; no unexecuted case is presented as measured evidence.
