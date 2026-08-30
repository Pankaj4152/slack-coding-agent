# Clean-Environment Rehearsal Record

Status: **PENDING EXECUTION**

Complete this record on a clean machine or disposable VM/container. Do not use the developer workstation’s existing dependencies, database, or authenticated browser session as proof of reproducibility.

## Environment

| Field                          | Recorded value                             |
| ------------------------------ | ------------------------------------------ |
| Rehearsal date (UTC)           | `[YYYY-MM-DD]`                             |
| Reviewer                       | `[redacted role or synthetic reviewer ID]` |
| OS/image                       | `[exact version]`                          |
| Node.js/npm                    | `[exact versions]`                         |
| Application commit             | `[full commit]`                            |
| Provider/model/tier            | `[redacted configuration, no secret]`      |
| Database                       | `[SQLite or PostgreSQL provider; no URL]`  |
| Target repository/start commit | `[sanitized identity and full commit]`     |
| Total elapsed time             | `[minutes]`                                |
| Active human time              | `[minutes]`                                |
| Estimated provider cost        | `[USD and method]`                         |

## Setup transcript

Record each documented command, exit status, duration, and concise redacted output.

| Step | Command/action                                                   | Exit/result | Duration | Evidence     |
| ---: | ---------------------------------------------------------------- | ----------- | -------: | ------------ |
|    1 | Install Node.js 20+ and clone repository                         | `[result]`  | `[time]` | `[evidence]` |
|    2 | `npm install`                                                    | `[exit]`    | `[time]` | `[evidence]` |
|    3 | Configure non-secret environment names and secret-manager values | `[result]`  | `[time]` | `[evidence]` |
|    4 | `npm run lint`                                                   | `[exit]`    | `[time]` | `[evidence]` |
|    5 | `npm run typecheck`                                              | `[exit]`    | `[time]` | `[evidence]` |
|    6 | `npm test`                                                       | `[exit]`    | `[time]` | `[evidence]` |
|    7 | Install workflow into disposable target repository               | `[result]`  | `[time]` | `[evidence]` |
|    8 | Start service and verify `/healthz` plus `/readyz`               | `[result]`  | `[time]` | `[evidence]` |
|    9 | Run one documented synthetic Slack task end to end               | `[result]`  | `[time]` | `[evidence]` |
|   10 | Generate evaluation and readiness reports                        | `[result]`  | `[time]` | `[evidence]` |

## Problems encountered

For each problem, record the symptom, root cause, documentation or code correction, and whether a fresh rehearsal confirmed the fix. Do not silently omit setup failures.

| Problem     | Root cause | Correction | Verified on clean rerun? |
| ----------- | ---------- | ---------- | ------------------------ |
| `[problem]` | `[cause]`  | `[change]` | `[yes/no]`               |

## Expected outputs verified

- [ ] Service liveness and database readiness are distinct and documented.
- [ ] Slack request creates exactly one mapped GitHub issue.
- [ ] Progress returns to the original Slack thread.
- [ ] Final workflow produces clarification, safe stop, no-change, or a human-reviewed PR as appropriate.
- [ ] No branch/PR is published after cancellation.
- [ ] No automatic merge or deployment occurs.
- [ ] Baseline/final evaluation commands create the documented ignored artifacts.
- [ ] `npm run submission:check` accurately reports remaining pending work.

## Rehearsal conclusion

Record `PASS` only after a second person can follow the written guide without undocumented intervention. Link only redacted evidence suitable for judges.
