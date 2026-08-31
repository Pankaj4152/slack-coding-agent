# HackerEarth Submission Form Copy

Review every placeholder against evidence before pasting. Do not submit bracketed text.

## Available live evidence

## Project name

**PRobe - Evidence-Gated Coding Agent for Slack**

## One-line description

PRobe turns a Slack engineering request into a planned, validated, independently verified, human-reviewed pull request while preserving clarification, approval, cancellation, retry, and audit evidence in the original thread.

## Intended user and problem

PRobe is for small engineering teams that coordinate work in Slack but maintain code and review controls in GitHub. Their bottleneck is not generating a patch: it is reconstructing intent, finding repository-specific instructions, resolving ambiguity, validating the implementation, detecting scope drift, and returning a result a human can safely review. Manual handoffs are slow and inconsistent; a direct coding-agent prompt can be fast but may silently misunderstand the task or overstate validation.

## Solution

A Slack mention creates a mapped GitHub issue only after repository preflight. A read-only planner converts the conversation and repository context into acceptance criteria or asks one focused clarification. Optional requester approval is cryptographically bound to the exact plan. A coding agent implements the approved scope. Trusted deterministic commands run without provider secrets, then an independent read-only verifier checks every criterion and the current diff. One repair is permitted only for actionable evidence and must pass fresh checks and fresh verification. Successful work ends at a pull request for human review; PRobe never merges or deploys automatically.

## Why agents are purposeful here

- Planner: separates intent and ambiguity resolution from mutation.
- Coder: uses repository context and tools to implement the bounded task.
- Verifier: independently evaluates criteria, checks, scope, risks, and confidence.
- Repair pass: performs one evidence-driven correction instead of an unbounded retry loop.
- Human checkpoints: clarification, optional plan approval, cancellation, retry, and mandatory PR review.

## Technical stack

TypeScript, Node.js 20+, Slack Bolt with Socket Mode, Fastify webhooks and health endpoints, GitHub App authentication, GitHub Issues and Actions, provider-selectable OpenAI Codex or Gemini CLI agents, SQLite for local operation or Neon PostgreSQL for hosted persistence, Vitest, ESLint, and Prettier.

## Honest baseline and hackathon additions

Before the hackathon, the company project could accept a Slack task, preflight a repository, create a GitHub issue, run one coding provider, report progress/failure, handle clarification/retry/cancellation, and return a pull request. The hackathon work added the fixed evaluation framework, read-only planner, trusted deterministic validation, independent verifier, one bounded repair with fresh reverification, plan-bound human approval, stronger state-transition guarantees, reproducible evidence tooling, trajectories, and submission gates.

## Measured result

Across the same ten fixed synthetic cases, verified completion changed from **[BASELINE_RATE]%** to **[FINAL_RATE]%**, a **[DELTA] percentage-point** change. Mean active human time changed from **[BASELINE_HUMAN]** to **[FINAL_HUMAN] minutes per task**, and estimated provider cost changed from **$[BASELINE_COST]** to **$[FINAL_COST] per task**. The final workflow averaged **[INVOCATIONS] provider invocations** and recovered **[REPAIR_RECOVERIES]/[REPAIR_ATTEMPTS]** eligible repair cases. Evidence: **[PUBLIC_COMPARISON_LINK]**.

## Most valuable change

**[MEASURED_WIN]** contributed the strongest measured improvement because **[EVIDENCE-BASED EXPLANATION]**.

## Rejected experiment

Unbounded automatic retries were rejected. They could hide unresolved ambiguity, multiply cost, reuse stale evidence, and continue after a human cancellation. The final design allows at most one evidence-driven repair and then returns control to the requester.

## Main failure mode and hot take

An orchestration audit found that late provider events could overwrite a recorded cancellation. Cancellation is now terminal and regression-tested. The practical lesson is that agent reliability depends as much on monotonic state transitions and evidence boundaries as on model capability: a strong model is still unsafe if stale events can reverse a human decision or if its validation claims are accepted without independent checks.

## Reproduction

Clone the public repository at **[FINAL_COMMIT]**, use Node.js **[VERSION]**, follow `hackathon/REPRODUCTION.md`, run the fixed baseline and final cases, and generate the comparison with the documented npm commands. Approximate full runtime: **[RUNTIME]**. Approximate provider cost: **[COST]**. Clean-environment evidence: **[REHEARSAL_LINK]**.

## Links

- Source repository: **[PUBLIC_REPOSITORY_URL]**
- Frozen commit: **[FINAL_COMMIT_URL]**
- Video, maximum five minutes: **[VIDEO_URL]**
- Improvement changelog: **[CHANGELOG_URL]**
- Reproduction guide: **[REPRODUCTION_URL]**
- Comparison evidence: **[COMPARISON_URL]**
- Agent trajectories: **[TRAJECTORIES_URL]**
- Evidence index: **[EVIDENCE_INDEX_URL]**

## Responsible-use statement

The evaluation uses synthetic/public data. Credentials remain in secret managers and are rejected from curated evidence. Consequential actions are bounded by clarification/approval controls and mandatory human pull-request review. The system does not automatically merge or deploy code.
