# Controlled Evaluation Automation Design

## Purpose

Phase 8 turns the existing baseline scorer into a symmetric baseline/final comparison pipeline. It automates evidence validation and arithmetic while keeping live provider execution manual and controlled. Missing observations remain failures and are never replaced with inferred or fabricated results.

## Inputs

Both workflows use the same tracked `cases.json`. Each run has:

- a validated run manifest;
- one observation per fixed case;
- acceptance-criterion and deterministic-check evidence;
- terminal outcome and repository-change status;
- first-attempt status, elapsed minutes, human minutes, cost, and provider invocation count; and
- final-workflow repair usage where applicable.

Raw generated results stay ignored until redacted and deliberately curated for submission.

## Commands

- `npm run evaluate:baseline -- init|report`
- `npm run evaluate:final -- init|report`
- `npm run evaluate:compare`

The comparison command validates that controlled fields match, reports explicit differences, and creates machine-readable and Markdown comparison artifacts.

## Metrics

- verified task completion rate;
- first-attempt success rate;
- clarification precision;
- average elapsed minutes per completed observation;
- human minutes per task;
- provider invocations per task;
- cost per task; and
- repair recovery rate for the final workflow.

Rates use fixed-case denominators where specified. A comparison refuses to present a final measured claim while either run contains `not-run` cases.

## Safety and integrity

- Scoring remains deterministic and provider-independent.
- Every criterion and required command needs non-empty evidence.
- Unknown/duplicate cases fail validation.
- No result file contains credentials, raw logs, databases, or private source.
- Baseline and final use the same provider, model, target start commit, case commit, runner, timeout, and repository instructions unless a difference is explicitly recorded.
- The report distinguishes measured values from pending live execution.
