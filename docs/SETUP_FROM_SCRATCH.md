# Setup from scratch

This guide deploys the Slack coding agent on Render and connects it to one or more GitHub repositories. The service creates GitHub issues from Slack, runs either Codex or Gemini in GitHub Actions, opens a pull request, and reports progress back to the original Slack thread.

## 1. Prerequisites

- A Slack workspace where you can install apps.
- A GitHub account or organization that owns the target repositories.
- A Render account.
- A PostgreSQL connection URL with TLS, such as Neon, Supabase, Aiven, or another hosted PostgreSQL provider.
- For Gemini: a Gemini API key from Google AI Studio.
- For Codex: an OpenAI project API key with API billing or credits.

Never commit API keys, Slack tokens, GitHub private keys, `.env`, database files, or logs.

## 2. Create the Slack app

Open <https://api.slack.com/apps>, select **Create New App**, and choose **From a manifest**. Select the intended workspace and use this YAML:

```yaml
display_information:
  name: Coding Agent
features:
  bot_user:
    display_name: Coding Agent
    always_online: false
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - channels:history
      - groups:history
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
      - message.groups
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

After creating it:

1. Open **Basic Information → App-Level Tokens**.
2. Generate an app token with `connections:write`.
3. Save the resulting `xapp-...` value for `SLACK_APP_TOKEN`.
4. Open **Install App** and install or reinstall it in the workspace.
5. Copy the `xoxb-...` Bot User OAuth Token for `SLACK_BOT_TOKEN`.
6. Open **Basic Information → App Credentials** and copy the Signing Secret for `SLACK_SIGNING_SECRET`.
7. Invite the app to every supported channel with `/invite @Coding Agent`.

For direct messages, also add `im:history` and the `message.im` event. For group DMs, add `mpim:history` and `message.mpim`, then reinstall the Slack app.

## 3. Create the GitHub App

Open **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**.

Use these settings:

```text
GitHub App name: a unique name, such as pankaj-slack-coding-agent
Homepage URL: your integration repository URL
Callback URL: blank
Request user authorization during installation: disabled
Device Flow: disabled
Setup URL: blank
Webhook: Active
Webhook URL: https://YOUR-RENDER-SERVICE.onrender.com/webhooks/github
Webhook secret: a new random secret
SSL verification: enabled
```

Repository permissions:

```text
Metadata: Read-only (mandatory)
Contents: Read and write
Issues: Read and write
Pull requests: Read and write
```

Subscribe to:

```text
Issue comment
Pull request
```

Choose **Only on this account** for a private/internal deployment. Save the app, generate and download a private key, then open **Install App** and install it on every target repository.

Record:

- `GITHUB_APP_ID` from the app settings page.
- `GITHUB_INSTALLATION_ID` from the numeric part of the installation URL, for example `https://github.com/settings/installations/12345678`.
- The complete downloaded PEM private key for `GITHUB_PRIVATE_KEY`.
- The webhook secret for `GITHUB_WEBHOOK_SECRET`.

The App ID and Installation ID are different values. The private-key SHA256 fingerprint shown by GitHub is not the private key.

## 4. Create the PostgreSQL database

Create a database with any hosted PostgreSQL provider and copy its connection URL. It must use TLS and include an SSL mode:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

The application creates and migrates its tables automatically. It does not require Supabase specifically.

## 5. Deploy the integration to Render

Push this repository to GitHub, then create a Render **Web Service** connected to it.

Recommended settings:

```text
Language: Docker
Branch: main
Root Directory: blank
Docker Build Context: .
Dockerfile Path: ./Dockerfile
Docker Command: blank
Health Check Path: /readyz
Auto-Deploy: On Commit
```

Add these Render environment variables:

```text
NODE_ENV=production
LOG_LEVEL=info
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
GITHUB_APP_ID=...
GITHUB_INSTALLATION_ID=...
GITHUB_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GITHUB_WEBHOOK_SECRET=...
DATABASE_URL=postgresql://...?sslmode=require
ALLOWED_REPOSITORIES=owner/repo-one,owner/repo-two
```

Render supplies `PORT`; do not hardcode a different public port. The GitHub App webhook secret must exactly match `GITHUB_WEBHOOK_SECRET`. Save the variables and deploy.

Verify:

```text
https://YOUR-RENDER-SERVICE.onrender.com/healthz
https://YOUR-RENDER-SERVICE.onrender.com/readyz
```

Opening `/webhooks/github` in a browser returns 404 because that route accepts signed GitHub `POST` requests only.

## 6. Configure each target repository

From this integration repository, install the workflow and starter instructions:

```powershell
cd F:\PeakClip\slack-coding-agent
npx tsx scripts/install-workflow.ts C:\path\to\target-repository
```

Review the generated `AGENTS.md`, then commit and push:

```powershell
git add .github/workflows/coding-agent.yml AGENTS.md
git commit -m "Add Slack coding agent workflow"
git push
```

In the target repository, open **Settings → Actions → General**:

1. Select **Allow all actions and reusable workflows**.
2. Select **Read and write permissions**.
3. Enable **Allow GitHub Actions to create and approve pull requests**.

The GitHub App must be installed on the repository, and its exact `owner/repository` name must appear in Render's `ALLOWED_REPOSITORIES`.

## 7. Choose Codex or Gemini

Provider selection is configured separately in every target repository under **Settings → Secrets and variables → Actions → Variables**.

### Gemini free tier

Create this repository variable:

```text
Name: CODING_AGENT_PROVIDER
Value: gemini
```

Create this repository secret:

```text
Name: GEMINI_API_KEY
Value: your Google AI Studio API key
```

The workflow uses the stable model:

```text
gemini-3.1-flash-lite
```

The unpaid Gemini API-key tier is intended for experimentation and light use. Quotas and eligible models are controlled by Google and may change. When the quota is exhausted or rate limited, the failure is reported in the Slack thread and the requester can retry later.

### Codex

Create this repository variable, or omit it because Codex is the default:

```text
Name: CODING_AGENT_PROVIDER
Value: codex
```

Create this repository secret:

```text
Name: OPENAI_API_KEY
Value: your funded OpenAI project API key
```

ChatGPT subscriptions do not fund API calls made by GitHub Actions.

Do not place either provider API key in Render. These keys belong only in each target repository's GitHub Actions secrets.

## 8. Test the complete flow

In an invited Slack channel, send:

```text
@Coding Agent repo: owner/repository Add a developer setup section to the README
```

Expected flow:

```text
Slack validates the repository
→ GitHub issue is created with agent-ready
→ GitHub Actions starts the selected provider
→ progress appears in the Slack thread
→ agent creates an agent/issue-N branch
→ workflow opens a pull request
→ Slack receives the pull-request link
```

If the task fails, the original requester can reply `retry`. While a task is active, the requester can reply `cancel` to prevent branch and pull-request publication.

## 9. Troubleshooting

- **No Slack app appears:** install/reinstall it in the correct workspace and invite it to the channel.
- **Issue creation fails:** confirm App ID, Installation ID, PEM private key, repository installation, permissions, and allowlist.
- **No Action run:** confirm the workflow exists on the default branch and Actions are enabled.
- **Repository preflight fails:** install the GitHub App and commit `.github/workflows/coding-agent.yml` to the default branch.
- **Webhook returns 401:** rotate the webhook secret, update both GitHub and Render, and redeploy Render.
- **No Slack completion/failure update:** inspect GitHub App **Advanced → Recent Deliveries** and require a 2xx response.
- **Gemini authentication fails:** replace `GEMINI_API_KEY` in the target repository, not Render.
- **Gemini quota fails:** wait for the free-tier quota window to reset or use a paid Gemini project.
- **Codex says no credits:** fund the OpenAI API project that owns `OPENAI_API_KEY`.
- **PR creation fails:** enable read/write workflow permissions and GitHub Actions pull-request creation.
