# slack-coding-agent

An internal MVP that turns a Slack mention into a GitHub issue, runs Codex or Gemini in the selected repository, and returns clarification questions or pull requests to the original Slack thread. It is designed for one small engineering team and never merges code.

## Intended user and bottleneck

This project is for small engineering teams that already coordinate work in Slack but cannot afford to have every incomplete request manually translated into repository context, acceptance criteria, implementation steps, validation, and a reviewable pull request. The bottleneck is not typing code alone: it is preserving intent across Slack and GitHub, asking for missing decisions at the right time, following repository-specific instructions, proving that the change works, and keeping consequential publication under human control.

The workflow turns one mapped Slack thread into an auditable GitHub task. Separate planning, coding, deterministic validation, independent verification, one bounded repair, and optional plan approval reduce the amount of unverified agent output a developer must untangle. The useful final result is evidence attached to a human-reviewed pull request, never an automatic merge.

For the complete Slack, GitHub App, Render, database, and target-repository walkthrough, see [Setup from scratch](docs/SETUP_FROM_SCRATCH.md).

## Architecture and workflow

```text
Slack Socket Mode ──> Node.js service ──> GitHub App / Issues
                           │                    │
                           v                    v
                     SQLite mapping       GitHub Actions
                                                │
                                                v
                                      openai/codex-action@v1
                                                │
                                                v
                                        branch + pull request
GitHub webhooks ───────────────> Node.js service ──> Slack thread
```

One Node.js process runs Slack Bolt, Fastify (`GET /health` and `POST /webhooks/github`), and SQLite. GitHub is the task record; SQLite only maps Slack threads to issues and tracks status/idempotency.

The normal flow is:

1. A user mentions the bot with `repo: owner/repository` and a task.
2. The service validates the repository allowlist, creates labels and an issue, and stores the mapping.
3. Label `agent-ready` starts the target repository workflow.
4. A read-only planner inspects the issue conversation, `AGENTS.md`, and repository context. It produces acceptance criteria and an implementation plan or asks one clarification question.
5. Repositories may optionally require the original requester to approve the exact plan fingerprint before coding begins.
6. The selected Codex or Gemini coding provider receives the approved plan, edits and validates the checkout, and returns structured output.
7. Deterministic workflow steps create a branch, commit, push, and PR. Agents do not perform GitHub state changes.
8. GitHub sends an `issue_comment` or `pull_request` webhook, and the service posts planning, approval, coding, validation, repair, verification, clarification, failure, or PR progress into the original Slack thread.

For clarification, the planner or coding agent comments with `<!-- agent-question -->` and applies `agent-needs-input`. The first human thread reply is posted to the issue, the label changes back to `agent-ready`, and a fresh workflow run reads the full conversation. Failures use `<!-- agent-failed -->`; this explicit final workflow step avoids unreliable `workflow_run` correlation.

## Prerequisites

- Node.js 20 or newer and npm
- A Slack app in the intended workspace
- A GitHub App installed on each allowlisted repository
- An OpenAI API key stored as a GitHub Actions secret in each target repository or organization
- A public HTTPS URL for GitHub webhooks (a secure Cloudflare Tunnel or ngrok tunnel is sufficient for local development)

`OPENAI_API_KEY` and `GEMINI_API_KEY` do **not** belong in this service's environment. They are target-repository GitHub Actions secrets.

By default, the service uses SQLite at `DATABASE_PATH`. For Render or multi-instance deployments, set `DATABASE_URL` to a pooled Neon/PostgreSQL connection string. When `DATABASE_URL` is present, PostgreSQL is used and `DATABASE_PATH` is ignored. The PostgreSQL adapter creates the same `tasks` and `processed_events` tables automatically. Use a TLS-enabled connection string and keep the password only in the hosting provider's secret environment variables.

## Slack app setup

Create a Slack app from scratch.

1. Enable **Socket Mode**.
2. Create an app-level token with `connections:write`; use it as `SLACK_APP_TOKEN`.
3. Add these bot token scopes:
   - `app_mentions:read`
   - `chat:write`
   - `channels:history` for public-channel thread replies
   - `groups:history` only if the bot will operate in private channels
   - `im:history` only if it will operate in DMs
   - `mpim:history` only if it will operate in group DMs
4. Under Event Subscriptions, subscribe to `app_mention` plus the message events for enabled surfaces: `message.channels`, `message.groups`, `message.im`, and/or `message.mpim`.
5. Install the app to the workspace and copy the bot token to `SLACK_BOT_TOKEN`.
6. Copy the signing secret to `SLACK_SIGNING_SECRET`.
7. Invite the bot to every public or private channel where it should work.

Public channels require `channels:history`; private channels require `groups:history` and an invitation. DMs and group DMs require their corresponding history scopes. Omit scopes and events for surfaces you will not support.

## GitHub App setup

Create a GitHub App owned by the organization or user that owns the target repositories.

Set repository permissions:

- Metadata: read
- Contents: read and write
- Issues: read and write
- Pull requests: read and write

No repository administration permission is needed. This implementation does not read Actions or Checks through the App.

Configure the webhook URL as `https://YOUR_SERVICE/webhooks/github`, generate a webhook secret, and subscribe to **Issue comments** and **Pull requests**. Generate a private key, install the App only on intended repositories, and record the App ID and installation ID. Put those values in `.env`; encode private-key newlines as `\n` as shown in `.env.example`.

The service automatically ensures these labels exist whenever it creates a task:

- `agent-ready`
- `agent-working`
- `agent-needs-input`
- `agent-awaiting-approval`
- `agent-pr-created`
- `agent-failed`
- `agent-cancelled`

## Repository allowlist

Edit [config/repositories.json](config/repositories.json) or set:

```env
ALLOWED_REPOSITORIES=owner/repo-one,owner/repo-two
```

The environment variable takes precedence. Repository matching is case-insensitive. Every repository must also be included in the GitHub App installation; the service never grants access dynamically.

## Install the target-repository workflow

Run from this project:

```bash
npx tsx scripts/install-workflow.ts /path/to/target-repository
```

This copies `templates/coding-agent.yml` to `.github/workflows/coding-agent.yml` and creates `AGENTS.md` only if one is absent. Review `AGENTS.md`, fill in exact setup and validation commands, then commit both files.

Alternatively, copy the two templates manually. In the target repository, set the Actions variable `CODING_AGENT_PROVIDER` to `codex` or `gemini`; Codex is the default. Add the matching Actions secret: `OPENAI_API_KEY` for Codex or `GEMINI_API_KEY` for Gemini. Gemini uses `gemini-3.1-flash-lite`. Ensure GitHub Actions is allowed to create pull requests under **Settings → Actions → General → Workflow permissions**.

Set `CODING_AGENT_APPROVAL_BOT_LOGIN` to the exact bot login used by this service's GitHub App, such as `probe-coding-agent[bot]`. Codex uses it to trust the GitHub App that starts the workflow. To also require requester approval after planning and before code edits, set `CODING_AGENT_REQUIRE_APPROVAL=true`; approval is accepted only from that configured bot and only when its SHA-256 fingerprint matches the freshly generated plan.

Each successful workflow attempt uses the selected provider for a read-only planning pass, a coding pass, and an independent read-only verification pass. If verification returns actionable `NEEDS_FIX` evidence, the workflow permits exactly one focused repair pass followed by fresh deterministic checks and a fresh read-only verifier. Account for three provider invocations normally and up to five when repair is used. A clarification or rejected plan stops before coding; provider failure, cancellation, and untrustworthy verification output stop without automatic repair.

By default, deterministic verification discovers fixed package-script names: `format:check`, `lint`, `typecheck`, `test`, and `build`. Repositories that need different commands can set the trusted Actions variable `CODING_AGENT_VALIDATION_COMMANDS_JSON` to a JSON array with at most eight commands:

```json
["npm run lint", "npm run typecheck", "npm test"]
```

Only repository administrators should control this variable. Planner-generated command suggestions are never executed directly. Commands run without provider secrets or a GitHub token, with bounded output and a ten-minute timeout per command.

The workflow checks that an issue has valid `slack-agent-metadata`, serializes runs per issue, uses least-privilege workflow permissions, and creates `agent/issue-N`. It never pushes to the default branch, merges, changes branch protection, or deploys.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env`. Fill in all credentials and replace the example allowlist. Required values are validated at startup with field-specific errors. Check `http://localhost:3000/health`.

Expose port 3000 through an authenticated/restricted HTTPS tunnel and configure the GitHub App webhook URL. Slack events still use outbound Socket Mode and do not require an inbound Slack URL.

Available checks:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Tests mock Slack and GitHub and make no external API calls.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The multistage image runs as the non-root `node` user. Compose persists `/app/data` in a named volume and the image health check calls `/health`.

### Neon/PostgreSQL option

The application supports either SQLite or PostgreSQL. In Neon, open the project, click **Connect**, and copy both the pooled and direct connection strings:

```env
DATABASE_URL=postgresql://user:<password>@ep-example-pooler.<region>.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:<password>@ep-example.<region>.aws.neon.tech/neondb?sslmode=require
```

When `DATABASE_URL` is set, the service initializes PostgreSQL automatically and uses parameterized queries for task mappings and processed events. The running service uses the pooled URL. `npm run db:migrate` prefers `DATABASE_URL_UNPOOLED`, because schema migrations and database dumps should use a direct connection. See [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).

To initialize the PostgreSQL schema without starting Slack or the webhook server, run:

```bash
npm run db:migrate
```

## Usage

Both forms are supported, including multiline descriptions:

```text
@Coding Agent repo: owner/repository Add cursor pagination to GET /customers
@Coding Agent repo=owner/repository Fix the customer export timeout
```

Repository names must be explicit `owner/repository` identifiers—not URLs, paths, or shell text.

When the bot asks a question, reply in the same Slack thread. Only the first valid human reply while the task is waiting is accepted. Review the returned PR manually; it will not be merged.

The service checks GitHub App access, repository state, Issues availability, and the presence of `.github/workflows/coding-agent.yml` before creating a task. Workflow start, clarification, failure, completion, and pull-request updates are posted back to the original Slack thread. When Codex fails, the workflow safely distinguishes exhausted API credits, an invalid API key, and temporary rate limiting so Slack receives an actionable reason.

If approval is enabled, only the original requester can reply with exactly `approve`; a changed plan requires approval again. If a task fails, the requester can reply with exactly `retry` in the same Slack thread. The service reuses the existing GitHub issue and starts a new workflow run; other Slack users cannot approve or retry someone else's task. The requester can reply `cancel` while a task is active or awaiting approval to prevent the workflow from publishing a branch or pull request.

## Troubleshooting

- **Invalid startup configuration:** compare `.env` to `.env.example`. Do not wrap numeric IDs in nonnumeric text.
- **Issue creation fails:** confirm the App installation ID, repository selection, and Issues permission.
- **No workflow run:** confirm the template is installed on the default branch, the issue has `agent-ready`, Actions is enabled, and labels exist.
- **Codex fails immediately:** confirm `OPENAI_API_KEY` is an Actions secret in the target repository/organization.
- **Task fails and needs another attempt:** reply `retry` in the original Slack thread as the user who created the task.
- **Plan is awaiting approval:** reply `approve` in the original Slack thread as the user who created the task.
- **Cancel an active task:** reply `cancel` in the original Slack thread as the user who created the task.
- **No Slack reply:** invite the bot to the channel and verify the matching message history scope/event.
- **Webhook returns 401:** the GitHub App and service must use the identical webhook secret; proxies must preserve the raw request body.
- **PR creation fails:** enable workflow PR creation and confirm `contents: write` / `pull-requests: write` are permitted.

Logs are structured and redact credentials. They intentionally contain task IDs, repository/issue identifiers, channels, threads, event types, and status transitions, but not tokens, private keys, authorization headers, source files, or API keys.

`GET /health` and `GET /healthz` are liveness checks. `GET /readyz` also verifies that the configured SQLite or PostgreSQL task store is reachable. Processed Slack and GitHub delivery IDs are retained for 90 days and cleaned up daily.

## Security notes

The service verifies webhook HMAC signatures, caps webhook bodies at 1 MiB, validates configuration and repository names, allowlists repositories, parameterizes SQLite, escapes metadata delimiters, filters Slack bots/edits, and deduplicates Slack and GitHub deliveries. Slack task text is never executed or used in a path. Keep all tokens in a secret manager and expose the webhook only over HTTPS.

Issue and comment content is untrusted prompt input. The workflow passes it through files rather than shell interpolation, validates the task metadata, and tells Codex not to treat it as permission to expose secrets or expand scope. GitHub-hosted runners are ephemeral, but organizations should still review the [official Codex Action security guidance](https://github.com/openai/codex-action/blob/main/docs/security.md).

## Intentional MVP limitations

- One coding task per Slack thread and one repository per task
- Repository must be explicit and allowlisted
- First human reply answers pending clarification
- No automatic merge or deployment
- No persistent Codex session; clarification starts a new workflow run
- No persistent planner session; retries and clarification reruns rebuild the plan from the full issue conversation
- Verification permits one bounded evidence-driven repair; a second failure stops for manual retry
- SQLite supports one service instance only; no high availability
- No retry queue, dashboard, sophisticated permission engine, or PR review-feedback automation
- Workflow dependency setup is repository-specific and must be documented in target `AGENTS.md`
- A crash between an external API operation and its local status update can require manual reconciliation

Future versions could add transactional outbox retries, GitHub installation discovery, multi-instance storage, richer Slack authorization, and PR review iteration without changing the issue/marker contract.
