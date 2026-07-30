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
