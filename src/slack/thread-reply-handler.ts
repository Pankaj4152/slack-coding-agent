import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { Octokit } from '@octokit/rest';
import type { Logger } from 'pino';
import { replaceAgentLabels } from '../github/labels.js';
import type { TaskStore } from '../tasks/task-repository.js';

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
  tasks: TaskStore;
  github: Octokit;
  logger: Logger;
}) {
  return async ({ event, body, client }: MessageArgs): Promise<void> => {
    const raw = event as unknown as Record<string, unknown>;
    if (!isHumanThreadReply(raw)) return;
    const eventId = (body as { event_id?: string }).event_id;
    if (!eventId || !(await deps.tasks.claimEvent(eventId, 'slack'))) return;
    const teamId = (body as { team_id?: string }).team_id;
    if (!teamId) return;
    const threadTs = raw.thread_ts as string;
    const channel = raw.channel as string;
    const task = await deps.tasks.findBySlackThread(teamId, channel, threadTs);
    if (!task) return;
    const text = (raw.text as string).trim();
    if (task.status === 'failed' && text.toLowerCase() === 'retry') {
      if (raw.user !== task.requesterUserId) {
        await client.chat.postMessage({
          channel,
          thread_ts: threadTs,
          text: 'Only the person who created this task can retry it.',
        });
        return;
      }
      await retryFailedTask(task, deps, client, channel, threadTs);
      return;
    }
    if (task.status !== 'needs_input') return;
    if (!(await deps.tasks.transitionStatus(task.id, 'needs_input', 'ready'))) return;

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
      await deps.tasks.transitionStatus(task.id, 'ready', 'needs_input');
      deps.logger.error({ err: error, taskId: task.id }, 'Clarification answer submission failed');
      await client.chat.postMessage({
        channel,
        thread_ts: threadTs,
        text: "I couldn't add that answer to GitHub. Please try again; the task is still waiting for clarification.",
      });
    }
  };
}

async function retryFailedTask(
  task: NonNullable<Awaited<ReturnType<TaskStore['findBySlackThread']>>>,
  deps: { tasks: TaskStore; github: Octokit; logger: Logger },
  client: MessageArgs['client'],
  channel: string,
  threadTs: string,
): Promise<void> {
  if (!(await deps.tasks.transitionStatus(task.id, 'failed', 'ready'))) return;
  try {
    await deps.github.rest.issues.createComment({
      owner: task.repositoryOwner,
      repo: task.repositoryName,
      issue_number: task.githubIssueNumber,
      body: '<!-- agent-retry -->\n\nRetry requested from the original Slack thread.',
    });
    await replaceAgentLabels(
      deps.github,
      task.repositoryOwner,
      task.repositoryName,
      task.githubIssueNumber,
      'agent-ready',
      ['agent-failed', 'agent-working', 'agent-needs-input'],
    );
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: 'Retry accepted. I restarted the coding agent on the same GitHub issue.',
    });
  } catch (error) {
    await deps.tasks.transitionStatus(task.id, 'ready', 'failed');
    deps.logger.error({ err: error, taskId: task.id }, 'Task retry failed');
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: "I couldn't restart the coding agent. The task is still marked as failed; check the GitHub App permissions and try again.",
    });
  }
}

function escapeComment(text: string): string {
  return text.trim().replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;').slice(0, 10_000);
}
