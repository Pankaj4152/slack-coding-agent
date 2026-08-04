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
});
