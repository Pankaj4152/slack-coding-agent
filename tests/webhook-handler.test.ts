import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { GithubWebhookHandler } from '../src/github/webhook-handler.js';
import { TaskRepository } from '../src/tasks/task-repository.js';

describe('GithubWebhookHandler', () => {
  let db: SqliteDatabase;
  let tasks: TaskRepository;
  beforeEach(async () => {
    db = openDatabase(':memory:');
    tasks = new TaskRepository(db);
    await tasks.create({
      id: '123e4567-e89b-12d3-a456-426614174000',
      workspaceId: 'T1',
      channelId: 'C1',
      threadTs: '1.1',
      requesterUserId: 'U1',
      repositoryOwner: 'owner',
      repositoryName: 'repo',
      githubIssueNumber: 10,
      status: 'working',
    });
  });
  afterEach(() => db.close());

  function makeHandler(postMessage = vi.fn().mockResolvedValue({})) {
    return {
      postMessage,
      handler: new GithubWebhookHandler(
        tasks,
        {
          rest: {
            issues: {
              addLabels: vi.fn().mockResolvedValue({}),
              removeLabel: vi.fn().mockResolvedValue({}),
            },
          },
        } as any,
        { chat: { postMessage } } as any,
        pino({ level: 'silent' }),
      ),
    };
  }

  it('posts a clarification once when a delivery is duplicated', async () => {
    const { handler, postMessage } = makeHandler();
    const payload = {
      action: 'created',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      issue: { number: 10 },
      comment: {
        id: 55,
        body: '<!-- agent-question -->\nWhich cursor format?',
        user: { login: 'github-actions[bot]' },
      },
    };
    await handler.handle('issue_comment', 'delivery-1', payload);
    await handler.handle('issue_comment', 'delivery-1', payload);
    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe(
      'needs_input',
    );
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('posts a started update once and transitions the task to working', async () => {
    await tasks.updateStatus('123e4567-e89b-12d3-a456-426614174000', 'ready');
    const { handler, postMessage } = makeHandler();
    const payload = {
      action: 'created',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      issue: { number: 10 },
      comment: {
        id: 56,
        body: '<!-- agent-started -->\n\nThe coding agent is inspecting the repository.',
        user: { login: 'github-actions[bot]' },
      },
    };
    await handler.handle('issue_comment', 'delivery-started', payload);
    await handler.handle('issue_comment', 'delivery-started-copy', payload);
    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe('working');
    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'The coding agent is inspecting the repository.' }),
    );
  });

  it('forwards a detailed failure to the mapped Slack thread', async () => {
    const { handler, postMessage } = makeHandler();
    await handler.handle('issue_comment', 'delivery-failed', {
      action: 'created',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      issue: { number: 10 },
      comment: {
        id: 57,
        body: '<!-- agent-failed -->\n\nCodex did not return a valid structured result.\n\nRun: https://github.test/run',
        user: { login: 'github-actions[bot]' },
      },
    });
    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe('failed');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'C1',
        thread_ts: '1.1',
        text: expect.stringContaining('Codex did not return a valid structured result.'),
      }),
    );
  });

  it('forwards an approved plan without changing the working state', async () => {
    const { handler, postMessage } = makeHandler();
    await handler.handle('issue_comment', 'delivery-plan', {
      action: 'created',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      issue: { number: 10 },
      comment: {
        id: 59,
        body: '<!-- agent-plan -->\n\nPlan approved with 3 acceptance criteria. Implementation is starting.',
        user: { login: 'github-actions[bot]' },
      },
    });
    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe('working');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'C1',
        thread_ts: '1.1',
        text: 'Plan approved with 3 acceptance criteria. Implementation is starting.',
      }),
    );
  });

  it('posts an opened PR in the mapped Slack thread', async () => {
    const { handler, postMessage } = makeHandler();
    await handler.handle('pull_request', 'delivery-pr', {
      action: 'opened',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      pull_request: {
        title: 'Add pagination',
        html_url: 'https://github.test/owner/repo/pull/1',
        body: '<!-- agent-pr task-id="123e4567-e89b-12d3-a456-426614174000" issue="10" -->',
        user: { login: 'github-actions[bot]' },
        head: { ref: 'agent/issue-10' },
      },
    });
    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe(
      'pr_created',
    );
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C1', thread_ts: '1.1' }),
    );
  });

  it('does not let a late completion overwrite a cancelled task', async () => {
    await tasks.updateStatus('123e4567-e89b-12d3-a456-426614174000', 'cancelled');
    const { handler, postMessage } = makeHandler();

    await handler.handle('issue_comment', 'delivery-late-completion', {
      action: 'created',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      issue: { number: 10 },
      comment: {
        id: 58,
        body: '<!-- agent-completed -->\n\nA late result arrived.',
        user: { login: 'github-actions[bot]' },
      },
    });

    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe(
      'cancelled',
    );
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('does not publish a PR notification for a cancelled task', async () => {
    await tasks.updateStatus('123e4567-e89b-12d3-a456-426614174000', 'cancelled');
    const { handler, postMessage } = makeHandler();

    await handler.handle('pull_request', 'delivery-late-pr', {
      action: 'opened',
      repository: { owner: { login: 'owner' }, name: 'repo' },
      pull_request: {
        title: 'Late change',
        html_url: 'https://github.test/owner/repo/pull/2',
        body: '<!-- agent-pr task-id="123e4567-e89b-12d3-a456-426614174000" issue="10" -->',
        user: { login: 'github-actions[bot]' },
        head: { ref: 'agent/issue-10' },
      },
    });

    expect((await tasks.findById('123e4567-e89b-12d3-a456-426614174000'))?.status).toBe(
      'cancelled',
    );
    expect(postMessage).not.toHaveBeenCalled();
  });
});
