import { App, LogLevel } from '@slack/bolt';
import type { Octokit } from '@octokit/rest';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import type { TaskStore } from '../tasks/task-repository.js';
import type { TaskService } from '../tasks/task-service.js';
import { createMentionHandler } from './mention-handler.js';
import { createThreadReplyHandler } from './thread-reply-handler.js';

export function createSlackApp(
  config: Config,
  deps: { tasks: TaskStore; service: TaskService; github: Octokit; logger: Logger },
) {
  const app = new App({
    token: config.slackBotToken,
    appToken: config.slackAppToken,
    signingSecret: config.slackSigningSecret,
    socketMode: true,
    logLevel: LogLevel.WARN,
  });
  app.event('app_mention', createMentionHandler(deps));
  app.event('message', createThreadReplyHandler(deps));
  app.error(async (error) => {
    deps.logger.error({ err: error }, 'Unhandled Slack event error');
  });
  return app;
}
