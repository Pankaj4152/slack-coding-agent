import type { Octokit } from '@octokit/rest';
import type { WebClient } from '@slack/web-api';
import type { Logger } from 'pino';
import { replaceAgentLabels } from './labels.js';
import { parseAgentMarker, parsePrTaskMarker } from './markers.js';
import type { TaskStore } from '../tasks/task-repository.js';
import { quoteForSlack } from '../slack/messages.js';

export class GithubWebhookHandler {
  constructor(
    private readonly tasks: TaskStore,
    private readonly github: Octokit,
    private readonly slack: WebClient,
    private readonly logger: Logger,
  ) {}

  async handle(eventName: string, deliveryId: string, payload: any): Promise<void> {
    if (!(await this.tasks.claimEvent(deliveryId, 'github'))) return;
    if (eventName === 'issue_comment' && payload.action === 'created') {
      await this.handleIssueComment(payload);
    } else if (eventName === 'pull_request' && payload.action === 'opened') {
      await this.handlePullRequest(payload);
    }
  }

  private async handleIssueComment(payload: any): Promise<void> {
    const owner = payload.repository?.owner?.login;
    const repo = payload.repository?.name;
    const issueNumber = payload.issue?.number;
    const body = payload.comment?.body;
    if (!owner || !repo || !issueNumber || typeof body !== 'string') return;
    if (payload.comment?.user?.login !== 'github-actions[bot]') return;
    const marker = parseAgentMarker(body);
    if (!marker) return;
    const task = await this.tasks.findByGithubIssue(owner, repo, issueNumber);
    if (!task) return;
    if (task.status === 'cancelled') {
      this.logger.info(
        { taskId: task.id, eventType: marker.type },
        'Ignored agent webhook for cancelled task',
      );
      return;
    }

    if (marker.type === 'started') {
      if (!(await this.tasks.transitionStatus(task.id, 'ready', 'working'))) return;
      await this.slack.chat.postMessage({
        channel: task.channelId,
        thread_ts: task.threadTs,
        text: marker.content || 'The coding agent started working on this task.',
      });
      return;
    }

    if (marker.type === 'question') {
      if (!marker.content) return;
      if (task.lastAgentQuestionCommentId === payload.comment.id) return;
      await this.tasks.updateStatus(task.id, 'needs_input', payload.comment.id);
      await replaceAgentLabels(this.github, owner, repo, issueNumber, 'agent-needs-input', [
        'agent-ready',
        'agent-working',
      ]);
      await this.slack.chat.postMessage({
        channel: task.channelId,
        thread_ts: task.threadTs,
        text: `The coding agent needs clarification:\n\n${quoteForSlack(marker.content)}\n\nReply in this thread to continue.`,
      });
      return;
    }

    if (marker.type === 'failed') {
      await this.tasks.updateStatus(task.id, 'failed');
      await replaceAgentLabels(this.github, owner, repo, issueNumber, 'agent-failed', [
        'agent-ready',
        'agent-working',
      ]);
      await this.slack.chat.postMessage({
        channel: task.channelId,
        thread_ts: task.threadTs,
        text: `The coding agent workflow failed.${marker.content ? `\n\n${quoteForSlack(marker.content)}` : ''}\n\nReply \`retry\` in this thread to start another attempt.`,
      });
      return;
    }

    await this.tasks.updateStatus(task.id, 'completed');
    await this.slack.chat.postMessage({
      channel: task.channelId,
      thread_ts: task.threadTs,
      text: `The coding agent completed the task.${marker.content ? `\n\n${quoteForSlack(marker.content)}` : ''}`,
    });
    this.logger.info({ taskId: task.id, eventType: 'agent-completed' }, 'Agent completed task');
  }

  private async handlePullRequest(payload: any): Promise<void> {
    const owner = payload.repository?.owner?.login;
    const repo = payload.repository?.name;
    const body = payload.pull_request?.body ?? '';
    const marker = parsePrTaskMarker(body);
    if (!owner || !repo || !marker) return;
    if (
      payload.pull_request?.user?.login !== 'github-actions[bot]' ||
      !String(payload.pull_request?.head?.ref ?? '').startsWith('agent/issue-')
    ) {
      return;
    }
    const task =
      (await this.tasks.findById(marker.taskId)) ??
      (await this.tasks.findByGithubIssue(owner, repo, marker.issueNumber));
    if (!task) return;
    if (task.status === 'cancelled') {
      this.logger.info(
        { taskId: task.id, eventType: 'pull-request' },
        'Ignored PR for cancelled task',
      );
      return;
    }

    await this.tasks.updateStatus(task.id, 'pr_created');
    await replaceAgentLabels(
      this.github,
      task.repositoryOwner,
      task.repositoryName,
      task.githubIssueNumber,
      'agent-pr-created',
      ['agent-ready', 'agent-working', 'agent-needs-input', 'agent-failed'],
    );
    await this.slack.chat.postMessage({
      channel: task.channelId,
      thread_ts: task.threadTs,
      text: `Pull request ready: *${escapeSlack(payload.pull_request.title)}*\n\nPR: ${payload.pull_request.html_url}\n\nPlease review it before merging.`,
    });
  }
}

function escapeSlack(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
