# Submission Evidence Index

Use this index as the single navigation page when assembling the final HackerEarth submission. Items marked pending must be replaced with redacted live artifacts, not prose claims.

## Deliverable 1: solution code and improvement changelog

- Product introduction and intended user: [`../README.md`](../README.md)
- Hackathon-specific thesis and status: [`README.md`](./README.md)
- Improvement history and work attribution: [`IMPROVEMENT_CHANGELOG.md`](./IMPROVEMENT_CHANGELOG.md)
- Removed experiment/design: unbounded automatic retry, documented as the rejected-design changelog entry and fixed ambiguity case.
- Active workflow: [`../.github/workflows/coding-agent.yml`](../.github/workflows/coding-agent.yml)
- Installable workflow template: [`../templates/coding-agent.yml`](../templates/coding-agent.yml)
- Planner design: [`PLANNER_DESIGN.md`](./PLANNER_DESIGN.md)
- Verifier design: [`VERIFIER_DESIGN.md`](./VERIFIER_DESIGN.md)
- Repair design: [`REPAIR_LOOP_DESIGN.md`](./REPAIR_LOOP_DESIGN.md)
- Human approval design: [`HUMAN_APPROVAL_DESIGN.md`](./HUMAN_APPROVAL_DESIGN.md)

## Deliverable 2: reproduction guide

- Company installation guide: [`../docs/SETUP_FROM_SCRATCH.md`](../docs/SETUP_FROM_SCRATCH.md)
- Hackathon reproduction guide: [`REPRODUCTION.md`](./REPRODUCTION.md)
- Controlled protocol: [`evaluation/PROTOCOL.md`](./evaluation/PROTOCOL.md)
- Evaluation runner instructions: [`evaluation/README.md`](./evaluation/README.md)
- Fixed evaluation cases: [`evaluation/cases.json`](./evaluation/cases.json)
- Manifest template: [`evaluation/run-manifest.example.json`](./evaluation/run-manifest.example.json)
- Baseline/final manifest templates: [`evaluation/baseline-manifest.example.json`](./evaluation/baseline-manifest.example.json) and [`evaluation/final-manifest.example.json`](./evaluation/final-manifest.example.json)
- Live execution worksheet: [`evaluation/LIVE_RUN_WORKSHEET.md`](./evaluation/LIVE_RUN_WORKSHEET.md)
- Clean rehearsal record: [`CLEAN_ENVIRONMENT_REHEARSAL.md`](./CLEAN_ENVIRONMENT_REHEARSAL.md)
- Pending: clean-environment rehearsal record with actual runtime and cost.

## Deliverable 3: solution video

- Recording plan and timing: [`VIDEO_SCRIPT.md`](./VIDEO_SCRIPT.md)
- Pending: final video URL, duration, captions, and access verification.

## Deliverable 4: agent trajectories

- Capture specification: [`AGENT_TRAJECTORIES.md`](./AGENT_TRAJECTORIES.md)
- Draft generator: `npm run trajectories:init` (writes ignored files under `hackathon/results/trajectory-drafts/`).
- Pending: redacted planner trajectory.
- Pending: redacted coding trajectory.
- Pending: redacted verifier `PASS` and `NEEDS_FIX` trajectories.
- Pending: redacted bounded-repair recovery or exhaustion trajectory.
- Pending: approval or clarification human-checkpoint trajectory.

## Measured results

- Metric and baseline definition: [`EVALUATION.md`](./EVALUATION.md)
- Evaluation automation design: [`EVALUATION_AUTOMATION_DESIGN.md`](./EVALUATION_AUTOMATION_DESIGN.md)
- Generated raw observations and reports: ignored under `hackathon/results/` until reviewed and redacted.
- Pending: tracked, curated final comparison with links to redacted case evidence.

## Final integrity checks

- Judging map: [`JUDGING_MAP.md`](./JUDGING_MAP.md)
- Submission checklist: [`SUBMISSION_CHECKLIST.md`](./SUBMISSION_CHECKLIST.md)
- Automated gate: `npm run submission:check` -> ignored `hackathon/results/submission-readiness.md`.
- No credentials, `.env`, databases, private logs, or private source in tracked or linked artifacts.
- No automatic merge behavior.
- No numerical improvement claim while comparison status is pending or non-comparable.
