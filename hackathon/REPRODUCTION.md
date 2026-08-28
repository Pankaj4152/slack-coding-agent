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

## Evaluation commands

The baseline and final evaluation commands will be added when the evaluation runners are implemented. They will use the fixed cases in `hackathon/evaluation/cases.json` and will document versions, runtime, required secrets, and expected outputs.

Credentials, `.env` files, SQLite databases, logs, and private source data must not be included in the submission.
