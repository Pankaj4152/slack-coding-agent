import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { Octokit } from '@octokit/rest';
import type { Logger } from 'pino';
import { replaceAgentLabels } from '../github/labels.js';
import type { TaskRepository } from '../tasks/task-repository.js';

type MessageArgs = AllMiddlewareArgs & SlackEventMiddlewareArgs<'message'>;

export function isHumanThreadReply(event: Record<string, unknown>): boolean {
  return (
    typeof event.thread_ts === 'string' &&
    typeof event.user === 'string' &&
    typeof event.text === 'string' &&
    event.text.trim().length > 0 &&
    !event.bot_id &&
    !event.bot_profile &&
    !event.subtype &&
    !event.hidden
  );
}

export function createThreadReplyHandler(deps: {
  tasks: TaskRepository;
  github: Octokit;
  logger: Logger;
}) {
  return async ({ event, body, client }: MessageArgs): Promise<void> => {
    const raw = event as unknown as Record<string, unknown>;
    if (!isHumanThreadReply(raw)) return;
    const eventId = (body as { event_id?: string }).event_id;
    if (!eventId || !deps.tasks.claimEvent(eventId, 'slack')) return;
    const teamId = (body as { team_id?: string }).team_id;
    if (!teamId) return;
    const threadTs = raw.thread_ts as string;
    const channel = raw.channel as string;
    const task = deps.tasks.findBySlackThread(teamId, channel, threadTs);
    if (!task || task.status !== 'needs_input') return;
    if (!deps.tasks.transitionStatus(task.id, 'needs_input', 'ready')) return;

    try {
      await deps.github.rest.issues.createComment({
        owner: task.repositoryOwner,
        repo: task.repositoryName,
        issue_number: task.githubIssueNumber,
        body: `## Slack clarification answer\n\nFrom \`<@${raw.user as string}>\`:\n\n${escapeComment(
          raw.text as string,
        )}`,
      });
      await replaceAgentLabels(
        deps.github,
        task.repositoryOwner,
        task.repositoryName,
        task.githubIssueNumber,
        'agent-ready',
        ['agent-needs-input', 'agent-working', 'agent-failed'],
      );
      await client.chat.postMessage({
        channel,
        thread_ts: threadTs,
        text: 'Thanks — I added your answer to the GitHub issue and restarted the coding agent.',
      });
    } catch (error) {
      deps.tasks.transitionStatus(task.id, 'ready', 'needs_input');
      deps.logger.error({ err: error, taskId: task.id }, 'Clarification answer submission failed');
      await client.chat.postMessage({
        channel,
        thread_ts: threadTs,
        text: "I couldn't add that answer to GitHub. Please try again; the task is still waiting for clarification.",
      });
    }
  };
}

function escapeComment(text: string): string {
  return text.trim().replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;').slice(0, 10_000);
}
