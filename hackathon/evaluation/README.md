# Baseline Evaluation Runner

The runner scores recorded observations against the acceptance criteria declared in `cases.json`. It does not call an AI provider or infer missing evidence. Follow [PROTOCOL.md](./PROTOCOL.md) to run cases consistently and record a manifest from `run-manifest.example.json` before starting.

Create an ignored observation template:

```text
npm run evaluate:baseline -- init
```

Copy `run-manifest.example.json` to `hackathon/results/baseline-manifest.json` and replace every placeholder. Run each case using those fixed conditions and fill in the generated `hackathon/results/baseline-observations.json` with redacted evidence, then calculate the reports:

```text
npm run evaluate:baseline
```

The runner validates the manifest and writes both `baseline-summary.json` and a submission-friendly `baseline-report.md`. Generated manifests, observations, summaries, and reports remain under `hackathon/results/` and are ignored by Git. Curated, redacted evidence can be copied into a submission artifact later after review.

The scorer requires the expected outcome, evidence for every acceptance criterion, successful evidence for every required command, and no disallowed repository changes. Missing or empty evidence fails the case.
