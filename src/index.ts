import 'dotenv/config';
import { loadConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { PostgresTaskRepository } from './db/postgres.js';
import { createGithubClient } from './github/auth.js';
import { GithubWebhookHandler } from './github/webhook-handler.js';
import { createLogger } from './logger.js';
import { createHttpServer } from './app.js';
import { createSlackApp } from './slack/create-slack-app.js';
import type { TaskStore } from './tasks/task-repository.js';
import { TaskService } from './tasks/task-service.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  let tasks: TaskStore;
  let closeStore: () => Promise<void>;
  if (config.databaseUrl) {
    const postgres = await PostgresTaskRepository.connect(config.databaseUrl);
    tasks = postgres;
    closeStore = () => postgres.close();
    logger.info('Using PostgreSQL task store');
  } else {
    const sqlite = openDatabase(config.databasePath);
    const { TaskRepository } = await import('./tasks/task-repository.js');
    tasks = new TaskRepository(sqlite);
    closeStore = async () => {
      sqlite.close();
    };
    logger.info('Using SQLite task store');
  }
  const github = createGithubClient({
    appId: config.githubAppId,
    installationId: config.githubInstallationId,
    privateKey: config.githubPrivateKey,
  });
  const service = new TaskService(tasks, github, config.allowedRepositories, logger);
  const slack = createSlackApp(config, { tasks, service, github, logger });
  const webhookHandler = new GithubWebhookHandler(tasks, github, slack.client, logger);
  const server = createHttpServer({
    webhookSecret: config.githubWebhookSecret,
    webhookHandler,
    logger,
    readinessCheck: () => tasks.checkHealth(),
  });

  const cleanupProcessedEvents = async () => {
    const before = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const deleted = await tasks.cleanupProcessedEvents(before);
      if (deleted > 0) logger.info({ deleted, before }, 'Cleaned up processed events');
    } catch (error) {
      logger.error({ err: error }, 'Processed event cleanup failed');
    }
  };
  await cleanupProcessedEvents();
  const cleanupTimer = setInterval(() => void cleanupProcessedEvents(), 24 * 60 * 60 * 1000);
  cleanupTimer.unref();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(cleanupTimer);
    logger.info({ signal }, 'Shutting down');
    await Promise.allSettled([slack.stop(), server.close()]);
    await closeStore();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await server.listen({ port: config.port, host: '0.0.0.0' });
  await slack.start();
  logger.info({ port: config.port }, 'Slack coding agent started');
}

main().catch((error) => {
  // Config errors contain field names but never secret values.
  console.error(error instanceof Error ? error.message : 'Fatal startup error');
  process.exitCode = 1;
});
