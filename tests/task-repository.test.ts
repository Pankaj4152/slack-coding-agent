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

  it('performs conditional status transitions atomically', async () => {
    await create();
    expect(await repository.transitionStatus('task-1', 'ready', 'working')).toBe(true);
    expect(await repository.transitionStatus('task-1', 'ready', 'working')).toBe(false);
  });
});
