# Slack Coding Agent Setup Checklist

This file explains what belongs in the Slack integration repository, what belongs in Render, and what must be installed in each target repository.

## 1. Two repositories are involved

### Integration repository

This repository runs the Slack bot and webhook server:

```text
Pankaj4152/slack-coding-agent
```

Deploy this repository to Render.

### Target repository

This is the repository that Codex changes. For example:

```text
Pankaj4152/customer-api
```

Every target repository needs:

```text
.github/workflows/coding-agent.yml
AGENTS.md
```

The integration service does not modify target source code directly. GitHub Actions and Codex do that work in the target repository.

## 2. Render environment variables

In Render, open:

```text
Service → Environment
```

Add these variables:

```env
NODE_ENV=production
PORT=10000
LOG_LEVEL=info

SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

GITHUB_APP_ID=...
GITHUB_INSTALLATION_ID=...
GITHUB_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
GITHUB_WEBHOOK_SECRET=...

DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require

ALLOWED_REPOSITORIES=Pankaj4152/customer-api
```

Do not commit these values. Do not add `OPENAI_API_KEY` to Render.

The service uses PostgreSQL whenever `DATABASE_URL` exists. `DATABASE_PATH` is only used for local SQLite fallback.

After saving the variables, choose **Save, rebuild, and deploy**.

The Render service must use:

```text
Runtime: Docker
Docker Build Context: .
Dockerfile Path: ./Dockerfile
Docker Command: blank
Health Check Path: /health
```

## 3. PostgreSQL database

Use any reachable PostgreSQL provider, including Aiven, Supabase, Neon, Railway, Render PostgreSQL, or a self-hosted server.

The connection URL must include TLS mode:

```text
?sslmode=require
```

Example:

```env
DATABASE_URL=postgres://app_user:password@postgres.example.com:5432/slack_agent?sslmode=require
```

If the password contains `@`, `:`, `/`, `#`, or spaces, URL-encode it.

The service automatically creates these tables at startup:

```text
tasks
processed_events
```

You can explicitly initialize the schema locally with:

```bash
npm run db:migrate
```

That command uses `DATABASE_URL` from the local `.env` file and does not start Slack.

## 4. Changing the target repository allowlist

For one repository, set this in Render:

```env
ALLOWED_REPOSITORIES=Pankaj4152/customer-api
```

For multiple repositories:

```env
ALLOWED_REPOSITORIES=Pankaj4152/customer-api,Pankaj4152/admin-api,Pankaj4152/web-app
```

Repository names must use exactly:

```text
owner/repository
```

After changing the allowlist, redeploy the Render service.

The GitHub App must also be installed on every repository listed in `ALLOWED_REPOSITORIES`.

## 5. Installing the workflow in a target repository

From this integration repository, run:

```bash
npx tsx scripts/install-workflow.ts C:\path\to\target-repository
```

For example:

```bash
npx tsx scripts/install-workflow.ts C:\src\customer-api
```

Review the generated files and commit them in the target repository:

```bash
git add .github/workflows/coding-agent.yml AGENTS.md
git commit -m "Add Slack coding agent workflow"
git push
```

If the target repository already has an `AGENTS.md`, the installer does not overwrite it. Merge the sections from `templates/AGENTS.md` manually when needed.

## 6. Target repository Actions secret

In every target repository, open:

```text
Settings → Secrets and variables → Actions
```

Add:

```text
Name: OPENAI_API_KEY
Value: your OpenAI API key
```

This secret belongs in GitHub Actions, not in Render and not in Slack.

Also enable:

```text
Settings → Actions → General → Workflow permissions
Read and write permissions
Allow GitHub Actions to create and approve pull requests
```

The workflow never merges pull requests automatically.

## 7. GitHub App checklist

The GitHub App should have these repository permissions:

```text
Metadata: Read-only
Contents: Read and write
Issues: Read and write
Pull requests: Read and write
```

All organization, user, account, administration, billing, and security permissions should be disabled.

Subscribe to these webhook events:

```text
Issue comment
Pull request
```

Install the GitHub App on every allowlisted target repository.

The GitHub webhook URL must be:

```text
https://YOUR-RENDER-SERVICE.onrender.com/webhooks/github
```

The webhook secret must exactly match:

```env
GITHUB_WEBHOOK_SECRET=...
```

## 8. Slack App checklist

Create the Slack app using **From a manifest**.

Required bot scopes:

```text
app_mentions:read
chat:write
channels:history
groups:history
```

Required bot events:

```text
app_mention
message.channels
message.groups
```

Enable Socket Mode and create an app-level token with:

```text
connections:write
```

Store the following in Render:

```text
xoxb-... → SLACK_BOT_TOKEN
xapp-... → SLACK_APP_TOKEN
Signing Secret → SLACK_SIGNING_SECRET
```

Invite the bot into every public or private channel where it should receive tasks.

## 9. First test

After Render reports a healthy deployment, send this message in an invited Slack channel:

```text
@Coding Agent repo: Pankaj4152/customer-api Add cursor pagination to GET /customers
```

Before creating the issue, the service verifies GitHub App access, Issues availability, and that `.github/workflows/coding-agent.yml` exists on the repository's default branch.

Expected sequence:

```text
Slack mention
→ GitHub issue created
→ agent-ready label added
→ GitHub Actions workflow starts
→ Codex changes the target repository
→ agent/issue-N branch is pushed
→ Pull request is opened
→ PR URL is posted in the Slack thread
```

Workflow start, clarification, failure, completion, and pull-request updates are posted in the original Slack thread. If a task fails, the original requester can reply with exactly `retry` in that thread to restart the same GitHub issue. Reply `cancel` while a task is active to prevent it from publishing a branch or pull request.

## 10. Changing repositories later

When adding a repository:

1. Install the GitHub App on the new repository.
2. Install the workflow and `AGENTS.md` there.
3. Add the repository to `ALLOWED_REPOSITORIES` in Render.
4. Redeploy the Render service.
5. Add `OPENAI_API_KEY` to the new repository's Actions secrets.
6. Confirm Actions can create pull requests.

When removing a repository:

1. Remove it from `ALLOWED_REPOSITORIES` in Render.
2. Redeploy the Render service.
3. Optionally uninstall the GitHub App from that repository.
4. Optionally remove its workflow file.

Removing a repository from the allowlist prevents new Slack tasks from targeting it. Existing GitHub issues and pull requests are not deleted automatically.

## 11. Troubleshooting

### Render starts but Slack does not connect

Check that:

```text
xoxb-... = bot token
xapp-... = Socket Mode app token
```

### PostgreSQL migration fails

Check that:

- `DATABASE_URL` is present in Render.
- The URL contains `?sslmode=require`.
- The database accepts connections from Render.
- The username and password are correct.
- Special password characters are URL-encoded.

### GitHub issue is not created

Check:

- The repository is in `ALLOWED_REPOSITORIES`.
- The GitHub App is installed on that repository.
- Issues permission is Read and write.
- The repository name is exactly `owner/repository`.

### GitHub Actions does not start

Check:

- The workflow is on the target repository's default branch.
- The issue has the `agent-ready` label.
- `OPENAI_API_KEY` exists in target repository Actions secrets.
- Actions can create pull requests.

### GitHub webhook returns 401

The GitHub App webhook secret and Render `GITHUB_WEBHOOK_SECRET` do not match. Update both to the same value and redeploy Render.
