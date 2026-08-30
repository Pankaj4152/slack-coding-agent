import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../src/db/database.js';
import { TaskRepository } from '../src/tasks/task-repository.js';

describe('TaskRepository', () => {
  let db: SqliteDatabase;
  let repository: TaskRepository;
  beforeEach(() => {
    db = openDatabase(':memory:');
    repository = new TaskRepository(db);
  });
  afterEach(() => db.close());

  async function create(id = 'task-1') {
    return repository.create({
      id,
      workspaceId: 'T1',
      channelId: 'C1',
      threadTs: '1.1',
      requesterUserId: 'U1',
      repositoryOwner: 'Owner',
      repositoryName: 'Repo',
      githubIssueNumber: 7,
      status: 'ready',
    });
  }

  it('creates and finds tasks by Slack thread and GitHub issue', async () => {
    expect((await create()).status).toBe('ready');
    expect((await repository.findBySlackThread('T1', 'C1', '1.1'))?.id).toBe('task-1');
    expect((await repository.findByGithubIssue('owner', 'repo', 7))?.id).toBe('task-1');
  });

  it('updates status and question comment', async () => {
    await create();
    expect(await repository.updateStatus('task-1', 'needs_input', 99)).toMatchObject({
      status: 'needs_input',
      lastAgentQuestionCommentId: 99,
    });
  });

  it('claims an event only once', async () => {
    expect(await repository.claimEvent('event-1', 'github')).toBe(true);
    expect(await repository.claimEvent('event-1', 'github')).toBe(false);
  });

  it('removes only processed events older than the retention cutoff', async () => {
    db.prepare(
      'INSERT INTO processed_events (event_id, source, processed_at) VALUES (?, ?, ?)',
    ).run('old-event', 'github', '2025-01-01T00:00:00.000Z');
    db.prepare(
      'INSERT INTO processed_events (event_id, source, processed_at) VALUES (?, ?, ?)',
    ).run('new-event', 'slack', '2026-08-01T00:00:00.000Z');
    expect(await repository.cleanupProcessedEvents('2026-01-01T00:00:00.000Z')).toBe(1);
    const remaining = db.prepare('SELECT event_id FROM processed_events').all() as {
      event_id: string;
    }[];
    expect(remaining.map((row) => row.event_id)).toEqual(['new-event']);
  });

  it('performs conditional status transitions atomically', async () => {
    await create();
    expect(await repository.transitionStatus('task-1', 'ready', 'working')).toBe(true);
    expect(await repository.transitionStatus('task-1', 'ready', 'working')).toBe(false);
  });
});
