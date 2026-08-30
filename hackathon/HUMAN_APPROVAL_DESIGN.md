# Human Approval and Progress Design

Implementation status: completed on `PRobe` in `cc05301`, `2f882f6`, and `ba5e511`. Controlled measurements remain pending.

## Purpose

Phase 7 adds an optional human checkpoint after planning and before repository edits. It also makes the approval state visible in the original Slack thread. The existing human PR review remains mandatory, and the system never merges automatically.

## Configuration

Target repositories opt in with the GitHub Actions variable `CODING_AGENT_REQUIRE_APPROVAL=true`. When absent or false, the current plan-to-code flow remains unchanged.

## Approval contract

1. The read-only planner returns `READY`.
2. The workflow computes a SHA-256 fingerprint of the normalized plan.
3. If the issue conversation does not contain a valid approval marker for that fingerprint, the workflow posts `<!-- agent-approval-required plan-sha256="..." -->` and applies `agent-awaiting-approval`.
4. The service maps the marker to the task and asks the original requester to reply exactly `approve` or `cancel` in Slack.
5. Only the original requester may approve. Approval adds `<!-- agent-approved plan-sha256="..." -->` to the same GitHub issue and reapplies `agent-ready`.
6. The fresh workflow run replans from the complete conversation. Coding starts only if the resulting fingerprint exactly matches the approved fingerprint.

Approval is therefore bound to plan contents rather than merely to a task or issue. A materially changed plan requires fresh approval.

## State and progress

- Add task state `awaiting_approval`.
- Add GitHub label `agent-awaiting-approval`.
- Add markers for approval requested and approval granted.
- Keep planning, coding, repair, verification, completion, failure, retry, and cancellation markers additive and in the existing mapped Slack thread.

## Safety rules

- Approval is requester-only and event-deduplicated.
- Empty, malformed, or stale fingerprints fail closed.
- Cancellation remains terminal.
- Approval does not authorize scope expansion, secret access, infrastructure changes, push, merge, or automatic merge.
- A new run must reconstruct and validate approval from GitHub; SQLite is not the source of plan truth.
- Approval failures restore `awaiting_approval` so the requester can try again safely.

## Verification

Tests must cover marker parsing, requester authorization, state and label transitions, stale-plan rejection, cancellation while awaiting approval, optional bypass when disabled, and the workflow gate before coding.
