# Agent Trajectory: [Case ID and Outcome]

Publication status: **DRAFT - REDACTION REQUIRED**

## Run identity

| Field                  | Value                        |
| ---------------------- | ---------------------------- |
| Evaluation case        | `[case-id]`                  |
| Workflow               | `baseline` or `final`        |
| Provider/model         | `[provider and exact model]` |
| Application commit     | `[commit]`                   |
| Target starting commit | `[synthetic commit]`         |
| Outcome                | `[expected -> observed]`     |
| Elapsed/cost           | `[minutes] / [USD estimate]` |

## 1. Request and applicable instructions

Include the exact synthetic case request, planned acceptance criteria, and the relevant redacted `AGENTS.md` instructions. Link to the tracked case definition.

## 2. Planner

Record the bounded planner prompt/context summary, repository reads, structured `READY`, `NEEDS_CLARIFICATION`, or `REJECTED` output, and plan fingerprint. Explain why the decision was correct for the fixed case.

## 3. Human checkpoint

Record clarification, plan approval, cancellation, or “not required.” Show requester authorization and resulting task/label transition without exposing Slack or GitHub identifiers.

## 4. Coding agent

Record the approved-plan input, significant file/tool actions, structured output, changed-file summary, and provider-reported validation. Do not equate provider-reported validation with deterministic evidence.

## 5. Deterministic validation

| Command     |     Exit | Duration | Redacted evidence  |
| ----------- | -------: | -------: | ------------------ |
| `[command]` | `[code]` |   `[ms]` | `[concise output]` |

Confirm whether checks modified the repository and whether configured commands were trusted repository settings.

## 6. Independent verifier

List every acceptance criterion exactly once with `PASS` or `FAIL`, concrete evidence, scope issues, risks, and confidence. Confirm the verifier remained read-only.

## 7. Repair, retry, or feedback

If repair ran, preserve attempt-0 evidence, show the focused repair input/output, and include fresh deterministic and verifier results. Prove that no second automatic repair occurred. Otherwise state why repair was ineligible or unnecessary.

## 8. Final result

Link the redacted PR/no-change/clarification/failure evidence and mapped Slack terminal message. Confirm no automatic merge occurred.

## 9. Evaluation score

Map each fixed criterion and required check to evidence, then record first-attempt status, human minutes, provider invocations, cost estimate, repository-change status, and verified/non-verified decision.

## 10. Redaction review

- [ ] No API keys, tokens, private keys, cookies, headers, or database URLs.
- [ ] No private Slack, repository, installation, run, user, or provider-project identifiers.
- [ ] No unnecessary proprietary source or raw logs.
- [ ] Evidence remains sufficient to reproduce the score.
