# Baseline Evaluation Runner

The runner scores recorded observations against the acceptance criteria declared in `cases.json`. It does not call an AI provider or infer missing evidence.

Create an ignored observation template:

```text
npm run evaluate:baseline -- init
```

Run each case using the same documented baseline configuration. Fill in the generated `hackathon/results/baseline-observations.json` with redacted evidence, then calculate the summary:

```text
npm run evaluate:baseline
```

The generated observation and summary files remain under `hackathon/results/` and are ignored by Git. Curated, redacted evidence can be copied into a submission artifact later after review.

The scorer requires the expected outcome, evidence for every acceptance criterion, successful evidence for every required command, and no disallowed repository changes. Missing or empty evidence fails the case.
