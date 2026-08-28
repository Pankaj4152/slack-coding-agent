# Evaluation Plan

## Primary metric

**Verified task completion rate**: the percentage of fixed evaluation cases for which the workflow satisfies the acceptance criteria, passes the required repository checks, and does not make an unapproved scope change.

## Comparison

The baseline and final workflow must use the same repository commit, task cases, provider and model configuration, validation commands, and maximum runtime. Any resource difference must be reported with the results.

## Baseline contract

The baseline is the merged company workflow on commit `63ff730`, before a separate planner or verification agent is added:

```text
Slack request
-> repository preflight
-> GitHub issue and preserved Slack metadata
-> selected Codex or Gemini coding provider
-> provider-reported validation
-> deterministic branch and pull-request creation
-> Slack progress, clarification, failure, retry, cancellation, or PR report
```

The baseline includes existing reliability features because they were implemented before this evaluation was established: repository preflight, progress reporting, requester-only retry and cancellation, health probes, provider failure diagnosis, event deduplication, and the cancellation race guard.

The baseline does not include a separate planning pass, independently scored acceptance criteria, an independent verification agent, or a bounded verification-driven repair loop.

## Evaluation cases

The ten synthetic cases are safe to share and target this repository's documented behavior. They cover a normal feature, bug fix, ambiguity, repository instructions, validation recovery, existing behavior, secret exposure, automatic merge policy, retry, and cancellation. The cases are listed in [evaluation/cases.json](./evaluation/cases.json).

Every case defines:

- a concrete request;
- acceptance criteria written before execution;
- deterministic checks where applicable;
- the expected workflow outcome;
- whether clarification is required; and
- whether repository changes are allowed.

Runs must follow the controlled setup, evidence, timing, cost, and redaction rules in [evaluation/PROTOCOL.md](./evaluation/PROTOCOL.md). Each run records its conditions using `evaluation/run-manifest.example.json` so provider or environment differences remain visible.

## Scoring rules

A case counts as verified completion only when its observed outcome matches the expected outcome, every acceptance criterion is supported by recorded evidence, all required checks pass, and the workflow makes no disallowed repository change.

Clarification, escalation, retry, cancellation, and no-change cases can count as successful outcomes; creating a pull request is not the correct result for every case. Missing evidence is scored as failure rather than inferred as success.

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
