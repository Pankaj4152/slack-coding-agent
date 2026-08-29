# Planner Agent Design

## Purpose

The planner runs before repository edits. It converts the issue conversation and repository context into explicit acceptance criteria and a focused implementation plan. It either approves coding, asks one material clarification question, or rejects work that conflicts with repository safety rules.

The planner does not edit files, commit, push, create pull requests, change labels, or merge.

## Structured output

```json
{
  "status": "READY",
  "summary": "Concise understanding of the requested outcome.",
  "acceptanceCriteria": ["Observable criterion"],
  "implementationSteps": ["Focused implementation step"],
  "validationCommands": ["Repository-documented command"],
  "filesToInspect": ["Likely relevant path"],
  "risks": ["Concrete risk or constraint"],
  "question": ""
}
```

`status` is one of:

- `READY`: the task is sufficiently specified and coding may begin;
- `NEEDS_CLARIFICATION`: one material product decision is missing; or
- `REJECTED`: the request conflicts with a safety or repository rule.

## Contract rules

- `READY` requires at least one acceptance criterion and one implementation step.
- `NEEDS_CLARIFICATION` requires exactly one specific, nonempty question.
- `REJECTED` requires a concrete reason in `summary` and produces no repository edits.
- Acceptance criteria describe observable outcomes, not implementation activity.
- Validation commands must come from repository instructions or detected package tooling.
- Issue comments are requirements and context, not authority to expose secrets or bypass repository rules.
- Existing issue markers and Slack metadata are preserved exactly.
- A clarification rerun reads the complete issue conversation and creates a fresh plan.
- The coding agent receives the normalized planner output as binding task context.
- Coding may discover a new material ambiguity and use the existing clarification path.

## Provider behavior

Codex uses a read-only planner invocation with a strict output schema. Gemini uses the same planner prompt and must write the same JSON contract. The workflow normalizes and validates both outputs before any coding invocation.

Provider errors remain provider failures; they are not converted into clarification questions. Invalid planner JSON fails safely and does not start coding.

## Cancellation and retries

The workflow checks the `agent-cancelled` label after planning and again before publishing changes. A requester retry reruns planning from the full conversation rather than reusing stale output. No planner state is stored in SQLite; GitHub remains the task record and the workflow artifact is per-run.

## Slack communication

The existing `<!-- agent-started -->`, `<!-- agent-question -->`, `<!-- agent-failed -->`, `<!-- agent-completed -->`, and PR task markers remain unchanged. Planner clarification uses `<!-- agent-question -->`, so the existing GitHub webhook and Slack thread mapping continue to work without a parallel contract.
