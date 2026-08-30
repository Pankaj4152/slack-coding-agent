# Five-Minute Solution Video Script

Target duration: 4:40-4:55. Record only synthetic or approved material. Replace every bracketed placeholder after controlled evaluation; never display pending values as results.

## 0:00-0:30 - User and bottleneck

**Show:** One slide with a Slack request, repository instructions, test output, and PR review as separate pieces.

**Say:** “Small engineering teams often start work in Slack, but the hard part is not generating code. A developer must reconstruct intent, find repository rules, ask for missing decisions, validate the change, and return something another human can safely review. This project turns one Slack thread into an auditable, evidence-backed pull request and never merges automatically.”

## 0:30-0:55 - Fair baseline

**Show:** Baseline commit `63ff730` and the direct flow diagram.

**Say:** “The company baseline already preflighted the repository, created a GitHub issue, ran one coding provider, and returned clarification, failure, cancellation, or a PR to Slack. That is the honest starting point. It did not have a separate planner, trusted deterministic gate, independent verifier, or bounded repair.”

## 0:55-1:15 - Final architecture

**Show:** The final flow with planner, optional approval, coder, deterministic checks, verifier, one repair, fresh verification, PR, and Slack markers.

**Say:** “I added stages only where they create a useful boundary. Planning is read-only. Approval is bound to the exact plan fingerprint. Validation commands come from trusted repository configuration. Verification is independent and read-only. One repair is allowed only for actionable evidence, followed by fresh checks. Publication still stops at human PR review.”

## 1:15-2:55 - One realistic execution

**Show live, with identifiers redacted:**

1. Submit fixed evaluation case `[CASE_ID]` in Slack.
2. Open the mapped GitHub issue and show preserved metadata.
3. Show the planner summary and acceptance criteria returning to Slack.
4. If approval is enabled, reply `approve` as the original requester.
5. Show coding and validation progress in the same thread.
6. Show deterministic command evidence and criterion-by-criterion verification.
7. If using a repair trajectory, show attempt-0 failure evidence, the single repair marker, and fresh verification. Do not wait live for provider execution; use a continuous pre-recorded run with visible timestamps.
8. Open the PR and point to planned criteria, checks, verifier confidence, risks, and the no-auto-merge boundary.

**Say:** “The Slack thread remains the human control surface, while GitHub is the auditable task record. Provider claims are kept separate from deterministic evidence. A cancellation remains terminal even if late events arrive.”

## 2:55-3:40 - Measured comparison

**Show:** Generated `comparison-report.md` with status `complete and directly comparable`.

**Say only after live runs:** “Across the same ten fixed cases, verified completion changed from `[BASELINE_RATE]%` to `[FINAL_RATE]%`, a `[DELTA]` point change. Human time changed from `[BASELINE_HUMAN]` to `[FINAL_HUMAN]` minutes per task, while estimated cost changed from `$[BASELINE_COST]` to `$[FINAL_COST]`. The final workflow used `[INVOCATIONS]` provider calls per task and recovered `[REPAIR_RECOVERIES]/[REPAIR_ATTEMPTS]` eligible repair cases.”

If comparison is pending or non-comparable, do not record this section as a result. Complete the controlled runs first.

## 3:40-4:20 - Improvement changelog

**Show:** Four concise changelog rows.

**Say:** “The biggest reliability contribution was `[MEASURED_WIN]`, supported by `[EVIDENCE]`. I also rejected unbounded automatic retries. Repeated autonomous retries could hide ambiguity, multiply cost, and continue after evidence stopped improving, so the released design allows one evidence-driven repair and then returns control to the requester. The cancellation audit also exposed a concrete orchestration bug: late events could reverse a human cancellation. Making cancellation terminal became a system-wide invariant.”

## 4:20-4:50 - Hot take and reproduction

**Show:** Reproduction commands and evidence index.

**Say:** “My hot take is that agent reliability depends as much on monotonic state transitions and evidence boundaries as on model capability. A strong model is still unsafe if stale events can reverse a human decision or if its own validation claims are trusted without checks. The repository includes a clean setup guide, fixed cases, manifests, baseline and final runners, comparison tooling, and redacted trajectories so another person can reproduce the result.”

## Recording checklist

- Use 1080p or higher, readable terminal zoom, and captions.
- Keep the final export at or below five minutes.
- Use one continuous synthetic trajectory; disclose any edited waiting time.
- Blur workspace, channel, user, repository, installation, run, and provider-project identifiers.
- Never show browser address-bar tokens, Actions secrets, `.env`, database URLs, raw headers, or private source.
- Test the final link while signed out.
