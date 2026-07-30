import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseAgentMarker, parsePrTaskMarker } from '../src/github/markers.js';
import { verifyWebhookSignature } from '../src/github/webhook-signature.js';

describe('agent markers', () => {
  it('parses question, completion, failure, and PR markers', () => {
    expect(parseAgentMarker('x\n<!-- agent-question -->\nWhich format?')).toEqual({
      type: 'question',
      content: 'Which format?',
    });
    expect(parseAgentMarker('<!-- agent-completed --> done')?.type).toBe('completed');
    expect(parseAgentMarker('<!-- agent-failed --> nope')?.type).toBe('failed');
    expect(parsePrTaskMarker('<!-- agent-pr task-id="abc" issue="42" -->')).toEqual({
      taskId: 'abc',
      issueNumber: 42,
    });
  });
});

describe('webhook signatures', () => {
  it('accepts only a valid HMAC SHA-256 signature', () => {
    const payload = '{"ok":true}';
    const signature = `sha256=${createHmac('sha256', 'secret').update(payload).digest('hex')}`;
    expect(verifyWebhookSignature(payload, signature, 'secret')).toBe(true);
    expect(verifyWebhookSignature(payload, signature, 'wrong')).toBe(false);
    expect(verifyWebhookSignature(payload, undefined, 'secret')).toBe(false);
  });
});
