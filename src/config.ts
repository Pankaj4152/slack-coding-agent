import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_APP_TOKEN: z.string().startsWith('xapp-'),
  SLACK_SIGNING_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.coerce.number().int().positive(),
  GITHUB_INSTALLATION_ID: z.coerce.number().int().positive(),
  GITHUB_PRIVATE_KEY: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  DATABASE_PATH: z.string().min(1).default('./data/slack-coding-agent.sqlite'),
  ALLOWED_REPOSITORIES: z.string().optional(),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join('\n')}`);
  }
  const values = parsed.data;
  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    logLevel: values.LOG_LEVEL,
    slackBotToken: values.SLACK_BOT_TOKEN,
    slackAppToken: values.SLACK_APP_TOKEN,
    slackSigningSecret: values.SLACK_SIGNING_SECRET,
    githubAppId: values.GITHUB_APP_ID,
    githubInstallationId: values.GITHUB_INSTALLATION_ID,
    githubPrivateKey: values.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
    githubWebhookSecret: values.GITHUB_WEBHOOK_SECRET,
    databasePath: resolve(values.DATABASE_PATH),
    allowedRepositories: loadAllowedRepositories(values.ALLOWED_REPOSITORIES),
  };
}

function loadAllowedRepositories(override?: string): ReadonlySet<string> {
  const repositories = override
    ? override.split(',').map((value) => value.trim())
    : (
        JSON.parse(readFileSync(resolve('config/repositories.json'), 'utf8')) as {
          allowedRepositories: string[];
        }
      ).allowedRepositories;
  const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
  if (repositories.length === 0 || repositories.some((repo) => !repositoryPattern.test(repo))) {
    throw new Error('Allowed repositories must contain valid owner/repository entries');
  }
  return new Set(repositories.map((repo) => repo.toLowerCase()));
}
