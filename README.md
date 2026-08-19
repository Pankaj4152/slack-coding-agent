# slack-coding-agent

An internal MVP that turns a Slack mention into a GitHub issue, runs an official OpenAI Codex GitHub Action in the selected repository, and returns clarification questions or pull requests to the original Slack thread. It is designed for one small engineering team and never merges code.

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
4. Codex reads the issue, comments, and `AGENTS.md`, edits and validates the checkout, and returns structured output.
5. Deterministic workflow steps create a branch, commit, push, and PR. Codex does not perform GitHub state changes.
6. GitHub sends an `issue_comment` or `pull_request` webhook, and the service posts into the original Slack thread.

For clarification, the workflow comments with `<!-- agent-question -->` and applies `agent-needs-input`. The first human thread reply is posted to the issue, the label changes back to `agent-ready`, and a fresh workflow run reads the full conversation. Failures use `<!-- agent-failed -->`; this explicit final workflow step avoids unreliable `workflow_run` correlation.

## Prerequisites

- Node.js 20 or newer and npm
- A Slack app in the intended workspace
- A GitHub App installed on each allowlisted repository
- An OpenAI API key stored as a GitHub Actions secret in each target repository or organization
- A public HTTPS URL for GitHub webhooks (a secure Cloudflare Tunnel or ngrok tunnel is sufficient for local development)

`OPENAI_API_KEY` does **not** belong in this service's environment.

By default, the service uses SQLite at `DATABASE_PATH`. For Render Free or multi-instance deployments, set `DATABASE_URL` to a PostgreSQL connection string (for example Supabase's Shared Pooler session-mode URL). When `DATABASE_URL` is present, PostgreSQL is used and `DATABASE_PATH` is ignored. The PostgreSQL adapter creates the same `tasks` and `processed_events` tables automatically. Use a TLS-enabled connection string and keep the password only in the hosting provider's secret environment variables.

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
- `agent-pr-created`
- `agent-failed`

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

Alternatively, copy the two templates manually. In the target repository or organization, add an Actions secret named `OPENAI_API_KEY`. Ensure GitHub Actions is allowed to create pull requests under **Settings → Actions → General → Workflow permissions**. The workflow uses `openai/codex-action@v1` with its current documented `prompt-file`, `output-file`, `output-schema`, `sandbox`, and `safety-strategy` inputs.

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

### Supabase/PostgreSQL option

The application supports either SQLite or PostgreSQL. Create a Supabase project, click **Connect**, and use the **Shared Pooler session mode** connection string for an IPv4-only Render service. Add it as:

```env
DATABASE_URL=postgres://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

When `DATABASE_URL` is set, the service initializes PostgreSQL automatically and uses parameterized queries for task mappings and processed events. Do not use the Supabase anon or service-role API keys for this connection. Supabase documents session mode for persistent backend services and transaction mode for serverless workloads. See [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

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

If a task fails, the original requester can reply with exactly `retry` in the same Slack thread. The service reuses the existing GitHub issue and starts a new workflow run; other Slack users cannot retry someone else's task. The requester can reply `cancel` while a task is active to prevent the workflow from publishing a branch or pull request.

## Troubleshooting

- **Invalid startup configuration:** compare `.env` to `.env.example`. Do not wrap numeric IDs in nonnumeric text.
- **Issue creation fails:** confirm the App installation ID, repository selection, and Issues permission.
- **No workflow run:** confirm the template is installed on the default branch, the issue has `agent-ready`, Actions is enabled, and labels exist.
- **Codex fails immediately:** confirm `OPENAI_API_KEY` is an Actions secret in the target repository/organization.
- **Task fails and needs another attempt:** reply `retry` in the original Slack thread as the user who created the task.
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
- SQLite supports one service instance only; no high availability
- No retry queue, dashboard, sophisticated permission engine, or PR review-feedback automation
- Workflow dependency setup is repository-specific and must be documented in target `AGENTS.md`
- A crash between an external API operation and its local status update can require manual reconciliation

Future versions could add transactional outbox retries, GitHub installation discovery, multi-instance storage, richer Slack authorization, and PR review iteration without changing the issue/marker contract.
