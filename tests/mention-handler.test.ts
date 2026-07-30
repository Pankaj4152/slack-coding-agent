import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { createMentionHandler } from '../src/slack/mention-handler.js';

describe('mention handler idempotency', () => {
  it('does not create two issues for a duplicate Slack delivery', async () => {
    const seen = new Set<string>();
    const create = vi.fn().mockResolvedValue({
      created: true,
      task: { githubIssueNumber: 42 },
    });
    const postMessage = vi.fn().mockResolvedValue({});
    const handler = createMentionHandler({
      tasks: {
        claimEvent: (id: string) => {
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        },
      } as any,
      service: { isAllowed: () => true, create } as any,
      logger: pino({ level: 'silent' }),
    });
    const args = {
      event: {
        text: '<@BOT> repo: owner/repo Add pagination',
        channel: 'C1',
        user: 'U1',
        ts: '1.1',
      },
      body: { event_id: 'Ev1', team_id: 'T1' },
      client: { chat: { postMessage } },
    };
    await handler(args as any);
    await handler(args as any);
    expect(create).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledOnce();
  });
});
