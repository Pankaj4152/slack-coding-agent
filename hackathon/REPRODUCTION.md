# Hackathon Reproduction Guide

This guide will describe how a reviewer can reproduce the baseline and final evaluation from a clean environment.

## Current repository checks

From the repository root:

```text
npm install
npm run format:check
npm run lint
npm run typecheck
npm test
```

## Baseline evaluation

Use an approved disposable target repository with synthetic data. Pin baseline application behavior to commit `63ff730`, complete a run manifest, and follow the full [execution protocol](./evaluation/PROTOCOL.md).

Use the separate baseline/final manifest examples and the [live-run worksheet](./evaluation/LIVE_RUN_WORKSHEET.md) to freeze controlled conditions before the first provider call. Record a second-person setup rehearsal in [CLEAN_ENVIRONMENT_REHEARSAL.md](./CLEAN_ENVIRONMENT_REHEARSAL.md).

Create the ignored observation templates:

```text
npm run evaluate:baseline -- init
npm run evaluate:final -- init
```

Run the ten fixed cases from `hackathon/evaluation/cases.json` under both controlled workflows, fill the generated observation files with redacted evidence, and calculate the summaries and comparison:

```text
npm run evaluate:baseline -- report
npm run evaluate:final -- report
npm run evaluate:compare
```

Expected generated files:

```text
hackathon/results/baseline-observations.json
hackathon/results/baseline-summary.json
hackathon/results/baseline-report.md
hackathon/results/final-observations.json
hackathon/results/final-summary.json
hackathon/results/final-report.md
hackathon/results/comparison-summary.json
hackathon/results/comparison-report.md
```

These files are ignored by Git until they have been reviewed and redacted. The comparison remains explicitly pending until all cases are executed and controlled conditions match.

Credentials, `.env` files, SQLite databases, logs, and private source data must not be included in the submission.
