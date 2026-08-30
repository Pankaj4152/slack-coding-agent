# Agent Trajectories

Representative trajectories will be added for every agent used by the final workflow.

## Planner trajectory

Capture the planner prompt, provider, normalized planner JSON, repository reads, and resulting `READY`, `NEEDS_CLARIFICATION`, or `REJECTED` decision. For `READY`, connect each acceptance criterion to coding and verification evidence. For clarification, include the Slack answer and the fresh plan produced on rerun.

## Coding trajectory

Capture the approved planner JSON passed to the coding agent, file/tool activity, structured result, changed-file summary, and reported validation. Clearly distinguish provider claims from deterministic command evidence.

## Verifier trajectory

Capture the approved plan, bounded repository diff, deterministic validation JSON, verifier prompt, normalized criterion-by-criterion decision, scope review, risks, and confidence. Include at least one `PASS` and one `NEEDS_FIX` example. Show that `NEEDS_FIX` stops before branch and PR creation.

## Required phase transitions

```text
issue accepted -> planning -> clarification or coding -> deterministic checks -> verification -> PR/no-change/failure
```

A cancellation may terminate any active phase. Late planner, provider, completion, failure, or PR events must not reverse that terminal state.

Each trajectory should show:

1. Input and applicable instructions.
2. Repository context and tools available.
3. Structured output from the agent.
4. Tool results and deterministic validation output.
5. Clarification, retry, or human approval checkpoints.
6. Final result and evidence.

All trajectories must be redacted before publication. Do not include credentials, private keys, access tokens, or unnecessary private source code.
