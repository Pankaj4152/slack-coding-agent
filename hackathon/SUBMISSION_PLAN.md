# HackerEarth Submission Execution Plan

Official deadline: **August 31, 2026 at 18:00 UTC (23:30 IST)**. Team size: one.

This is the operational checklist for converting the implemented PRobe project into the four deliverables required by the micro1 Agentic Workflows Hackathon brief. The detailed evidence remains in the linked documents; this page is the submission-day control surface.

## Current readiness

Run:

```text
npm run submission:check
```

Status on August 31: **PENDING - 3 pass, 6 pending, 0 fail**.

| Requirement                             | Current state                           | Completion evidence                                          |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| Complete code and improvement changelog | Implemented; final measured row pending | Public final commit, root README, `IMPROVEMENT_CHANGELOG.md` |
| Reproduction guide                      | Written; clean rehearsal pending        | Completed `CLEAN_ENVIRONMENT_REHEARSAL.md`                   |
| Video, maximum five minutes             | Script ready; recording pending         | Public/unlisted URL tested signed out                        |
| Agent trajectories                      | Templates ready; captures pending       | At least four redacted files under `hackathon/trajectories/` |

## Critical path - do in this order

### 1. Freeze the submission candidate

1. Stop feature work except submission-blocking fixes.
2. Confirm the intended provider/model configuration and record it in both run manifests.
3. Record the final application commit and evaluation case-file commit.
4. Confirm the public repository contains no `.env`, credentials, database files, private logs, or private customer code.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run submission:check`.

Do not change the workflow between baseline and final runs unless both sets are restarted and the change is disclosed.

### 2. Execute the controlled evaluation

Use one disposable public/synthetic target repository. Follow `evaluation/PROTOCOL.md` and `evaluation/LIVE_RUN_WORKSHEET.md`.

```text
npm run evaluate:baseline -- init
npm run evaluate:final -- init
```

1. Fill `hackathon/results/baseline-manifest.json` and `final-manifest.json` before provider execution.
2. Run all ten fixed cases against baseline commit `63ff730` in declared order.
3. Run the same ten cases against the frozen final commit under matching conditions.
4. Record outcome, criterion evidence, deterministic checks, elapsed time, active human time, provider invocations, repairs, and estimated USD cost for every case.
5. Preserve failures and timeouts; never rerun only to improve the score.

Generate reports:

```text
npm run evaluate:baseline -- report
npm run evaluate:final -- report
npm run evaluate:compare
```

The comparison must say `complete=true` and `comparable=true`. If it does not, fix the evidence or rerun both sides under matching conditions; do not claim numerical improvement.

### 3. Curate representative trajectories

Run `npm run trajectories:init`, then create at least these redacted captures from real evaluation runs:

1. Planner `READY` or clarification trajectory.
2. Coding trajectory ending in a usable change.
3. Verifier trajectory with criterion-by-criterion evidence.
4. Repair trajectory showing `NEEDS_FIX -> one repair -> fresh verification`.

Include one human checkpoint (approval, clarification, cancellation, or retry). Each trajectory must show instructions, relevant context, tool calls/results, normalized structured output, deterministic evidence, feedback, and final outcome. Remove credentials and private identifiers without altering the technical sequence.

### 4. Perform the clean-environment rehearsal

Ask a second person to follow `REPRODUCTION.md` and `docs/SETUP_FROM_SCRATCH.md` from a clean machine or disposable VM. Complete every field in `CLEAN_ENVIRONMENT_REHEARSAL.md`, including exact versions, runtime, active human time, approximate cost, and any setup problem discovered.

### 5. Finalize the narrative documents

Replace all measured placeholders in:

- `IMPROVEMENT_CHANGELOG.md`
- `EVALUATION.md`
- `VIDEO_SCRIPT.md`
- `EVIDENCE_INDEX.md`
- `SUBMISSION_FORM_COPY.md`

Every number must link to the generated comparison or case evidence. Name the most valuable measured change and one rejected experiment. Keep the pre-hackathon product baseline separate from hackathon additions.

### 6. Record the video

Use `VIDEO_SCRIPT.md`. Target 4:40-4:55 and never exceed five minutes.

Show, in order:

1. Intended user and bottleneck.
2. Honest baseline.
3. Final architecture.
4. One continuous synthetic Slack-to-PR execution.
5. Planner, human checkpoint, coding, deterministic checks, verifier, optional repair, and PR evidence.
6. Final baseline comparison.
7. Most valuable change, rejected unbounded retry, hot take, and reproduction path.

Export at 1080p or higher with captions. Hide all secrets and private identifiers. Test the link in a signed-out browser.

### 7. Final integrity gate and submission

1. Ensure judge access to the repository and video.
2. Verify every link in `EVIDENCE_INDEX.md` at the frozen commit.
3. Run `npm run submission:check`; required result: `PASS`, zero pending, zero failed.
4. Paste the reviewed content from `SUBMISSION_FORM_COPY.md` into HackerEarth.
5. Save screenshots of the completed form and confirmation page.

## Stop-ship conditions

Do not submit numerical claims if the comparison is incomplete or non-comparable. Do not submit raw Actions logs, `.env` files, database URLs, private keys, Slack tokens, API keys, customer repositories, or proprietary Slack conversations. Do not imply that pre-hackathon capabilities were created during the event. Do not enable automatic merge or deployment for the demo.

## Personal inputs still required

Only the participant can provide or approve these items:

- Participant name and contact details exactly as registered.
- Final public repository URL and frozen commit.
- Video recording, upload URL, duration, captions, and signed-out access check.
- A second-person clean-environment rehearsal.
- Live baseline/final observations, timing, and provider billing estimates.
- Final decision on whether company/public branding and repository identifiers may be shown.
- Final HackerEarth submission and confirmation capture.
