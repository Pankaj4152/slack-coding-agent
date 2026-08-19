import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { Logger } from 'pino';
import { parseSlackTask } from '../tasks/task-parser.js';
import type { TaskStore } from '../tasks/task-repository.js';
import { RepositoryPreflightError, type TaskService } from '../tasks/task-service.js';
import { invalidTaskMessage } from './messages.js';

type MentionArgs = AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>;

export function createMentionHandler(deps: {
  service: TaskService;
  tasks: TaskStore;
  logger: Logger;
}) {
  return async ({ event, body, client }: MentionArgs): Promise<void> => {
    const threadTs = event.thread_ts ?? event.ts;
    const workspaceId = body.team_id;
    const eventId = body.event_id;
    if (!(await deps.tasks.claimEvent(eventId, 'slack'))) return;
    if (!event.user) return;

    const parsed = parseSlackTask(event.text);
    if (!parsed.ok) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text: invalidTaskMessage(parsed.reason),
      });
      return;
    }
    if (!deps.service.isAllowed(parsed.repository)) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text: `Repository \`${parsed.repository}\` is not allowed. Ask the service owner to add it to the repository allowlist.`,
      });
      return;
    }

    try {
      const result = await deps.service.create({
        workspaceId,
        channelId: event.channel,
        threadTs,
        requesterUserId: event.user,
        owner: parsed.owner,
        repo: parsed.name,
        task: parsed.task,
      });
      const prefix = result.created ? 'Created' : 'This thread already has';
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text: `${prefix} GitHub issue #${result.task.githubIssueNumber} in \`${parsed.repository}\`.\n\nThe coding agent is starting. I'll post questions and the resulting pull request in this thread.`,
      });
    } catch (error) {
      deps.logger.error(
        {
          err: error,
          repository: parsed.repository,
          slackChannel: event.channel,
          slackThread: threadTs,
        },
        'GitHub issue creation failed',
      );
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text:
          error instanceof RepositoryPreflightError
            ? error.message
            : "I couldn't create the GitHub issue. Check the GitHub App installation and repository permissions, then try again.",
      });
    }
  };
}
