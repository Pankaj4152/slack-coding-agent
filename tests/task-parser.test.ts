import { describe, expect, it } from 'vitest';
import { parseSlackTask } from '../src/tasks/task-parser.js';

describe('parseSlackTask', () => {
  it.each([
    ['<@U123> repo: owner/repository Add pagination', 'owner/repository', 'Add pagination'],
    ['<@U123> repo=owner/repository Fix the bug', 'owner/repository', 'Fix the bug'],
  ])('parses valid syntax', (text, repository, task) => {
    expect(parseSlackTask(text)).toMatchObject({ ok: true, repository, task });
  });

  it('preserves multiline task descriptions', () => {
    expect(parseSlackTask('<@U1> repo: owner/repo First line\nSecond line')).toMatchObject({
      ok: true,
      task: 'First line\nSecond line',
    });
  });

  it('rejects a missing repository', () => {
    expect(parseSlackTask('<@U1> do something')).toEqual({
      ok: false,
      reason: 'missing_repository',
    });
  });

  it.each([
    '<@U1> repo: https://github.com/o/r task',
    '<@U1> repo: ../owner/repo task',
    '<@U1> repo: owner/repo;rm task',
    '<@U1> repo: owner task',
  ])('rejects invalid repositories: %s', (text) => {
    expect(parseSlackTask(text)).toEqual({ ok: false, reason: 'invalid_repository' });
  });

  it('rejects an empty task', () => {
    expect(parseSlackTask('<@U1> repo: owner/repo ')).toEqual({ ok: false, reason: 'empty_task' });
  });
});
