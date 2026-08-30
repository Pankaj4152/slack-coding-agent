# Bounded Repair Loop Design

Implementation status: completed on `PRobe` in `846cc3c` with Slack progress reporting in `adea419`. Controlled outcome measurements remain pending.

## Purpose

The repair loop gives the coding provider one focused opportunity to correct an implementation that independent verification classified as `NEEDS_FIX`. It uses the verifier's exact evidence and deterministic failures, then reruns the complete verification gate.

The loop is bounded to one automatic repair attempt. A second failure stops safely and requires the original requester to use the existing manual `retry` flow.

## Eligibility

Automatic repair runs only when:

- planning returned `READY`;
- the initial coding pass returned `COMPLETED`;
- the task is not cancelled;
- independent verification returned `NEEDS_FIX`; and
- the failure is actionable implementation or test evidence.

Automatic repair does not run for:

- planner clarification or rejection;
- planner, coding, or verifier provider failure;
- invalid structured output;
- authentication, quota, or rate-limit errors;
- cancellation;
- a request that violates repository policy; or
- a verifier failure that cannot produce trustworthy evidence.

## Repair input

The repair provider receives:

- the approved planner result;
- the original coding result;
- initial deterministic command results;
- initial verifier result;
- the current bounded diff; and
- explicit instructions to fix only the reported failures.

It does not receive permission to expand scope, alter safety policy, merge, push, or create a pull request.

## Repair output

The repair result uses the existing coding-agent contract:

```json
{
  "status": "COMPLETED",
  "summary": "What was repaired.",
  "question": "",
  "validation": ["Checks run by the repair provider"],
  "risks": "Remaining risks",
  "noChangesRequired": false
}
```

A repair clarification stops and uses the existing `agent-question` flow. A failed repair uses the existing failure path.

## Reverification

After repair, the workflow reruns trusted deterministic commands and invokes a fresh read-only verifier. PR creation requires the final verifier to return `PASS`; the initial verifier cannot approve repaired code.

Attempt-0 and repair artifacts remain separate so trajectories can show the failure evidence, repair response, and final decision.

## Stopping rules

- Maximum automatic repair attempts: one.
- No repair after `FAILED`, cancellation, or non-actionable policy/scope rejection.
- No repeated repair when the same or a new verification failure remains.
- No automatic merge under any outcome.
- Manual Slack `retry` starts a fresh workflow run and rebuilds the plan from the full issue conversation.

## Measurement

Track repair eligibility, whether repair ran, final recovery status, additional provider cost, added elapsed time, and whether the repaired task passed without human code changes. Compare recovery gains against the extra cost and latency.
