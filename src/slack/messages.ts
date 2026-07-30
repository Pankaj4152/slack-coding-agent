import type { ParseResult } from '../tasks/task-parser.js';

export function invalidTaskMessage(reason: Extract<ParseResult, { ok: false }>['reason']): string {
  if (reason === 'invalid_repository') {
    return 'That repository is invalid. Use a plain `owner/repository` name (not a URL or path).';
  }
  if (reason === 'empty_task') {
    return 'Please include a task after the repository, for example:\n`@Coding Agent repo: owner/repository Describe the task`';
  }
  if (reason === 'too_long')
    return 'That task is too long. Please keep it under 10,000 characters.';
  return "I couldn't identify the repository. Use:\n`@Coding Agent repo: owner/repository Describe the task`";
}

export function quoteForSlack(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
}
