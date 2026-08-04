import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { createThreadReplyHandler, isHumanThreadReply } from '../src/slack/thread-reply-handler.js';
import { TaskRepository } from '../src/tasks/task-repository.js';

describe('thread reply handling', () => {
  let db: SqliteDatabase;
  let tasks: TaskRepository;
  beforeEach(async () => {
    db = openDatabase(':memory:');
    tasks = new TaskRepository(db);
    await tasks.create({
      id: 'task',
      workspaceId: 'T1',
      channelId: 'C1',
      threadTs: '1.1',
      requesterUserId: 'U1',
      repositoryOwner: 'owner',
      repositoryName: 'repo',
      githubIssueNumber: 12,
      status: 'needs_input',
    });
  });
  afterEach(() => db.close());

  it('filters bots, edits, and non-thread messages', () => {
    expect(isHumanThreadReply({ user: 'U', text: 'yes', thread_ts: '1' })).toBe(true);
    expect(isHumanThreadReply({ bot_id: 'B', user: 'U', text: 'yes', thread_ts: '1' })).toBe(false);
    expect(
      isHumanThreadReply({ subtype: 'message_changed', user: 'U', text: 'yes', thread_ts: '1' }),
    ).toBe(false);
    expect(isHumanThreadReply({ user: 'U', text: 'yes' })).toBe(false);
  });

  it('posts an answer, relabels, and confirms in Slack', async () => {
    const createComment = vi.fn().mockResolvedValue({});
    const addLabels = vi.fn().mockResolvedValue({});
    const removeLabel = vi.fn().mockResolvedValue({});
    const postMessage = vi.fn().mockResolvedValue({});
    const handler = createThreadReplyHandler({
      tasks,
      github: { rest: { issues: { createComment, addLabels, removeLabel } } } as any,
      logger: pino({ level: 'silent' }),
    });
    await handler({
      event: { user: 'U2', channel: 'C1', text: 'Use opaque cursors', thread_ts: '1.1', ts: '1.2' },
      body: { event_id: 'Ev1', team_id: 'T1' },
      client: { chat: { postMessage } },
    } as any);
    expect(createComment).toHaveBeenCalledOnce();
    expect(addLabels).toHaveBeenCalledWith(expect.objectContaining({ labels: ['agent-ready'] }));
    expect((await tasks.findById('task'))?.status).toBe('ready');
    expect(postMessage).toHaveBeenCalledOnce();
  });
});
