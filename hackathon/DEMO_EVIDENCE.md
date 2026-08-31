# Representative Live Demo Evidence

This is one real end-to-end demonstration, not the complete ten-case controlled benchmark.

## Request

`@PRobe repo: pankaj4152/Testing-Repo create a file named DEMO.md with a title "PRobe Demo", a short description of this repository, and a section called "Demo Status". This is documentation-only. Do not modify source files, dependencies, workflows, or configuration. Validate with git diff --check.`

## Trace

- Slack thread: https://mafiapal.slack.com/archives/C0BME3359NK/p1788191349461199
- GitHub issue: https://github.com/Pankaj4152/Testing-Repo/issues/30
- GitHub Actions run: https://github.com/Pankaj4152/Testing-Repo/actions/runs/33410628723
- Pull request: https://github.com/Pankaj4152/Testing-Repo/pull/31
- Start: 21:19 IST, August 31, 2026
- End: approximately 21:21 IST, August 31, 2026
- Actions execution duration: approximately 1 minute 25 seconds
- Provider: Codex
- Model: `gpt-5.6-luna`, medium effort
- Reported usage: approximately 100,000 tokens; estimated cost must be confirmed from provider billing

## Outcome

The workflow created only `DEMO.md`, opened PR #31, and preserved the requested scope. The task used temporary `DEMO_FAST_MODE`, so independent AI verification and repair were intentionally skipped. The report showed `0/0` deterministic commands because no repository validation command was discovered; therefore this run demonstrates orchestration and PR creation, not full verification quality.

Do not use this record as a ten-case benchmark or claim the synthetic comparison results as measured evidence.
