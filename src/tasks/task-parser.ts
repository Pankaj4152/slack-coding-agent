export type ParseResult =
  | { ok: true; repository: string; owner: string; name: string; task: string }
  | { ok: false; reason: 'missing_repository' | 'invalid_repository' | 'empty_task' | 'too_long' };

const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function parseSlackTask(text: string): ParseResult {
  const withoutMentions = text.replace(/<@[A-Z0-9]+>/gi, '').trim();
  const match = withoutMentions.match(/^repo\s*[:=]\s*(\S+)(?:[ \t]+|[\r\n]+)([\s\S]*)$/i);
  if (!match) {
    return {
      ok: false,
      reason: /\brepo\s*[:=]/i.test(withoutMentions) ? 'empty_task' : 'missing_repository',
    };
  }
  const repository = match[1] ?? '';
  const task = (match[2] ?? '').trim();
  if (!repositoryPattern.test(repository) || repository.includes('..')) {
    return { ok: false, reason: 'invalid_repository' };
  }
  if (!task) return { ok: false, reason: 'empty_task' };
  if (task.length > 10_000) return { ok: false, reason: 'too_long' };
  const [owner, name] = repository.split('/') as [string, string];
  return { ok: true, repository, owner, name, task };
}
