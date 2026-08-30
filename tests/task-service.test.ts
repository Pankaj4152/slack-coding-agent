import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/database.js';
import { TaskRepository } from '../src/tasks/task-repository.js';
import { TaskService } from '../src/tasks/task-service.js';

describe('repository allowlist', () => {
  it('accepts only configured repositories, case-insensitively', () => {
    const db = openDatabase(':memory:');
    const service = new TaskService(
      new TaskRepository(db),
      {} as any,
      new Set(['owner/repo']),
      pino({ level: 'silent' }),
    );
    expect(service.isAllowed('Owner/Repo')).toBe(true);
    expect(service.isAllowed('other/repo')).toBe(false);
    db.close();
  });
});

describe('repository preflight', () => {
  function makeService(github: any) {
    const db = openDatabase(':memory:');
    return {
      db,
      service: new TaskService(
        new TaskRepository(db),
        github,
        new Set(['owner/repo']),
        pino({ level: 'silent' }),
      ),
    };
  }

  it('checks repository access and the workflow before creating an issue', async () => {
    const github = {
      rest: {
        repos: {
          get: async () => ({
            data: { archived: false, disabled: false, has_issues: true, default_branch: 'main' },
          }),
          getContent: async () => ({ data: {} }),
        },
        issues: {
          getLabel: async () => ({ data: {} }),
          create: async () => ({ data: { number: 12 } }),
        },
      },
    };
    const { db, service } = makeService(github);
    const result = await service.create({
      workspaceId: 'T1',
      channelId: 'C1',
      threadTs: '1.1',
      requesterUserId: 'U1',
      owner: 'owner',
      repo: 'repo',
      task: 'Add documentation',
    });
    expect(result.task.githubIssueNumber).toBe(12);
    db.close();
  });

  it('returns an actionable error when the repository or workflow is unavailable', async () => {
    const github = {
      rest: {
        repos: {
          get: async () => ({
            data: { archived: false, disabled: false, has_issues: true, default_branch: 'main' },
          }),
          getContent: async () => {
            throw Object.assign(new Error('Not found'), { status: 404 });
          },
        },
      },
    };
    const { db, service } = makeService(github);
    await expect(
      service.create({
        workspaceId: 'T1',
        channelId: 'C1',
        threadTs: '1.1',
        requesterUserId: 'U1',
        owner: 'owner',
        repo: 'repo',
        task: 'Add documentation',
      }),
    ).rejects.toThrow(/coding-agent\.yml.*main/);
    db.close();
  });

  it('distinguishes missing GitHub App access from a missing workflow', async () => {
    const github = {
      rest: {
        repos: {
          get: async () => {
            throw Object.assign(new Error('Not found'), { status: 404 });
          },
        },
      },
    };
    const { db, service } = makeService(github);
    await expect(
      service.create({
        workspaceId: 'T1',
        channelId: 'C1',
        threadTs: '1.1',
        requesterUserId: 'U1',
        owner: 'owner',
        repo: 'repo',
        task: 'Add documentation',
      }),
    ).rejects.toThrow(/Install the PRobe GitHub App/);
    db.close();
  });
});
