# Frontier Engineering Challenge 2026

This folder contains material prepared specifically for the micro1 Agentic Workflows Hackathon. Company-facing documentation remains in the repository root and its normal documentation locations.

## Submission thesis

Slack is where a developer request begins, but the request may be incomplete and the resulting code change needs evidence before a human reviews it. This project is evolving from a Slack-to-GitHub task handoff into a controlled workflow that plans, clarifies, implements, verifies, and reports software changes without merging automatically.

## Hackathon material

- [Improvement changelog](./IMPROVEMENT_CHANGELOG.md)
- [Evaluation plan](./EVALUATION.md)
- [Reproduction guide](./REPRODUCTION.md)
- [Agent trajectories](./AGENT_TRAJECTORIES.md)
- [Video script](./VIDEO_SCRIPT.md)
- [Evaluation cases](./evaluation/cases.json)

These documents will be updated with measured results as each implementation phase is completed. No result should be described as final until it has been reproduced using the documented commands.

## Current progress

- Company feature branches have been integrated without changing the no-automatic-merge contract.
- The baseline application is pinned to commit `63ff730`.
- Ten fixed evaluation cases, evidence-based scoring, a controlled execution protocol, and report generation are implemented.
- Live baseline measurements are still pending and are not represented by fabricated values.
- The next product iteration is a separate planner stage.
