# Controlled Evaluation Runners

The runner scores recorded observations against the acceptance criteria declared in `cases.json`. It does not call an AI provider or infer missing evidence. Follow [PROTOCOL.md](./PROTOCOL.md) to run cases consistently and record a manifest from `run-manifest.example.json` before starting.

Create ignored observation templates:

```text
npm run evaluate:baseline -- init
npm run evaluate:final -- init
```

Copy `run-manifest.example.json` to `hackathon/results/baseline-manifest.json` and `final-manifest.json`, replace every placeholder, and set each `workflow` correctly. Run each case using the fixed conditions and fill both generated observation files with redacted evidence. Record elapsed and human minutes, provider invocations, cost, and final-workflow repair usage. Then calculate the reports and comparison:

```text
npm run evaluate:baseline -- report
npm run evaluate:final -- report
npm run evaluate:compare
```

The runners validate each manifest and write workflow summaries and submission-friendly reports. The comparison writes `comparison-summary.json` and `comparison-report.md`, flags controlled-condition mismatches, and marks results pending while either run contains unexecuted cases. Generated manifests, observations, summaries, and reports remain under `hackathon/results/` and are ignored by Git. Curated, redacted evidence can be copied into a submission artifact later after review.

The scorer requires the expected outcome, exact evidence coverage for every acceptance criterion and required command, and no disallowed repository changes. Missing, empty, unexpected/stale, or credential-like evidence fails validation or the case.
