# Evaluation Plan

## Primary metric

**Verified task completion rate**: the percentage of fixed evaluation cases for which the workflow satisfies the acceptance criteria, passes the required repository checks, and does not make an unapproved scope change.

## Comparison

The baseline and final workflow must use the same repository state, task cases, model configuration, and validation commands. The baseline is the existing single coding-agent workflow. The final workflow will include planning, verification, and bounded recovery where those phases are implemented.

## Evaluation cases

The initial cases are synthetic and safe to share. They cover normal changes, ambiguity, repository context, failing validation, no-op work, and unsafe scope expansion. The cases are listed in [evaluation/cases.json](./evaluation/cases.json).

## Results

Results will be added after the evaluation runner exists.

| Metric                           | Baseline |   Final |  Change |
| -------------------------------- | -------: | ------: | ------: |
| Verified task completion rate    |  Pending | Pending | Pending |
| First-attempt success rate       |  Pending | Pending | Pending |
| Clarification precision          |  Pending | Pending | Pending |
| Human intervention time per task |  Pending | Pending | Pending |
| Cost per task                    |  Pending | Pending | Pending |

All claims will link to raw, redacted run artifacts or deterministic command output.
