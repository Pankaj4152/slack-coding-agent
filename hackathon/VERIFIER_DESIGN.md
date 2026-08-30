# Verification Agent Design

## Purpose

Verification runs after coding and before branch or pull-request creation. It combines deterministic command results with a read-only review of the approved plan and repository diff. It does not repair code in this phase.

## Structured output

```json
{
  "status": "PASS",
  "summary": "Concise verification conclusion.",
  "criteria": [
    {
      "criterion": "Exact planned acceptance criterion",
      "status": "PASS",
      "evidence": "Specific file, diff, or test evidence"
    }
  ],
  "checksReviewed": ["npm test: exit 0"],
  "scopeIssues": [],
  "risks": [],
  "confidence": 90
}
```

`status` is one of:

- `PASS`: every planned criterion has evidence, deterministic checks pass, and no scope violation is found;
- `NEEDS_FIX`: one or more actionable implementation or test problems remain; or
- `FAILED`: verification could not produce a trustworthy decision.

## Deterministic command trust boundary

Planner-generated commands are advisory and are never passed to a shell. Executable commands come only from:

1. `CODING_AGENT_VALIDATION_COMMANDS_JSON`, a repository Actions variable controlled by repository administrators; or
2. safely discovered package scripts with fixed names such as `format:check`, `lint`, `typecheck`, `test`, and `build`.

Configured commands are capped in number and length. Each command has a timeout and bounded captured output. The validation step does not receive provider API keys or a GitHub token.

## Verification rules

- Every planner acceptance criterion must appear exactly once in verifier output.
- Empty or unknown evidence cannot produce `PASS`.
- Any failed or timed-out deterministic check prevents `PASS`.
- Unexpected scope changes prevent `PASS`.
- The verifier is read-only; repository modifications make verification fail safely.
- Provider claims are context, not proof of deterministic checks.
- Cancellation is checked before verification and again before publishing any result.
- `PASS` is required before PR creation.
- `NEEDS_FIX` stops safely in Phase 5; bounded automatic repair belongs to Phase 6.

## Existing contracts

Issue metadata, Slack thread mapping, clarification markers, completion markers, failure markers, PR markers, and the no-automatic-merge rule remain unchanged. An additive verification marker may report progress without changing task ownership.
