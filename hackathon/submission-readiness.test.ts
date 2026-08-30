import { describe, expect, it } from 'vitest';
import {
  renderReadinessMarkdown,
  summarizeReadiness,
  type ReadinessItem,
} from './submission-readiness.js';

describe('submission readiness', () => {
  it('uses fail over pending over pass precedence', () => {
    const items: ReadinessItem[] = [
      { area: 'a', status: 'PASS', detail: 'ok' },
      { area: 'b', status: 'PENDING', detail: 'waiting' },
      { area: 'c', status: 'FAIL', detail: 'broken' },
    ];
    expect(summarizeReadiness(items, '2026-08-30T00:00:00Z')).toMatchObject({
      status: 'FAIL',
      counts: { PASS: 1, PENDING: 1, FAIL: 1 },
    });
  });

  it('renders a readable Markdown report', () => {
    const report = summarizeReadiness(
      [{ area: 'Evaluation', status: 'PENDING', detail: '10 cases remain' }],
      '2026-08-30T00:00:00Z',
    );
    expect(renderReadinessMarkdown(report)).toContain('Overall status: **PENDING**');
    expect(renderReadinessMarkdown(report)).toContain('| Evaluation | PENDING | 10 cases remain |');
  });
});
