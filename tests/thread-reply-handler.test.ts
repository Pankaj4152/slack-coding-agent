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

  it('lets the original requester retry a failed task', async () => {
    await tasks.updateStatus('task', 'failed');
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
      event: { user: 'U1', channel: 'C1', text: 'retry', thread_ts: '1.1', ts: '1.3' },
      body: { event_id: 'Ev2', team_id: 'T1' },
      client: { chat: { postMessage } },
    } as any);
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('agent-retry') }),
    );
    expect(addLabels).toHaveBeenCalledWith(expect.objectContaining({ labels: ['agent-ready'] }));
    expect((await tasks.findById('task'))?.status).toBe('ready');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Retry accepted') }),
    );
  });

  it('rejects retries from someone other than the requester', async () => {
    await tasks.updateStatus('task', 'failed');
    const addLabels = vi.fn().mockResolvedValue({});
    const postMessage = vi.fn().mockResolvedValue({});
    const handler = createThreadReplyHandler({
      tasks,
      github: { rest: { issues: { addLabels, removeLabel: vi.fn() } } } as any,
      logger: pino({ level: 'silent' }),
    });
    await handler({
      event: { user: 'U2', channel: 'C1', text: 'retry', thread_ts: '1.1', ts: '1.4' },
      body: { event_id: 'Ev3', team_id: 'T1' },
      client: { chat: { postMessage } },
    } as any);
    expect(addLabels).not.toHaveBeenCalled();
    expect((await tasks.findById('task'))?.status).toBe('failed');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Only the person') }),
    );
  });

  it('lets only the original requester approve the current plan fingerprint', async () => {
    await tasks.updateStatus('task', 'awaiting_approval');
    const createComment = vi.fn().mockResolvedValue({});
    const addLabels = vi.fn().mockResolvedValue({});
    const removeLabel = vi.fn().mockResolvedValue({});
    const postMessage = vi.fn().mockResolvedValue({});
    const listComments = vi.fn();
    const github = {
      paginate: vi.fn().mockResolvedValue([
        {
          body: '<!-- agent-approval-required plan-sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" -->',
          user: { login: 'github-actions[bot]' },
        },
      ]),
      rest: { issues: { createComment, addLabels, removeLabel, listComments } },
    };
    const handler = createThreadReplyHandler({
      tasks,
      github: github as any,
      logger: pino({ level: 'silent' }),
    });
    await handler({
      event: { user: 'U1', channel: 'C1', text: 'approve', thread_ts: '1.1', ts: '1.6' },
      body: { event_id: 'Ev5', team_id: 'T1' },
      client: { chat: { postMessage } },
    } as any);
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('agent-approved') }),
    );
    expect(addLabels).toHaveBeenCalledWith(expect.objectContaining({ labels: ['agent-ready'] }));
    expect((await tasks.findById('task'))?.status).toBe('ready');
  });

  it('rejects plan approval from someone other than the requester', async () => {
    await tasks.updateStatus('task', 'awaiting_approval');
    const postMessage = vi.fn().mockResolvedValue({});
    const handler = createThreadReplyHandler({
      tasks,
      github: {} as any,
      logger: pino({ level: 'silent' }),
    });
    await handler({
      event: { user: 'U2', channel: 'C1', text: 'approve', thread_ts: '1.1', ts: '1.7' },
      body: { event_id: 'Ev6', team_id: 'T1' },
      client: { chat: { postMessage } },
    } as any);
    expect((await tasks.findById('task'))?.status).toBe('awaiting_approval');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Only the person') }),
    );
  });

  it('lets the original requester cancel an active task', async () => {
    await tasks.updateStatus('task', 'working');
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
      event: { user: 'U1', channel: 'C1', text: 'cancel', thread_ts: '1.1', ts: '1.5' },
      body: { event_id: 'Ev4', team_id: 'T1' },
      client: { chat: { postMessage } },
    } as any);
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('agent-cancelled') }),
    );
    expect(addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['agent-cancelled'] }),
    );
    expect((await tasks.findById('task'))?.status).toBe('cancelled');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Task cancelled') }),
    );
  });
});
