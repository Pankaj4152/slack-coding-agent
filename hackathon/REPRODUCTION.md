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

Create the ignored observation template:

```text
npm run evaluate:baseline -- init
```

Run the ten fixed cases from `hackathon/evaluation/cases.json`, fill the generated observation file with redacted evidence, and calculate the summary:

```text
npm run evaluate:baseline
```

Expected generated files:

```text
hackathon/results/baseline-observations.json
hackathon/results/baseline-summary.json
hackathon/results/baseline-report.md
```

These files are ignored by Git until they have been reviewed and redacted. The final workflow will use the same cases and scoring rules.

Credentials, `.env` files, SQLite databases, logs, and private source data must not be included in the submission.
