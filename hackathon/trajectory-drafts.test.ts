import { describe, expect, it } from 'vitest';
import { draftFileName, renderTrajectoryDraft } from './trajectory-drafts.js';
import type { EvaluationCase } from './evaluation/evaluation.js';

const evaluationCase: EvaluationCase = {
  id: 'safe-case',
  category: 'feature',
  request: 'Add a safe feature.',
  acceptanceCriteria: ['The safe feature works.'],
  requiredChecks: ['npm test'],
  expectedOutcome: 'pull-request',
  requiresClarification: false,
  allowsRepositoryChanges: true,
};

describe('trajectory draft generation', () => {
  it('creates safe stable filenames', () => {
    expect(draftFileName('safe-case')).toBe('safe-case-trajectory.md');
    expect(() => draftFileName('../unsafe')).toThrow('Unsafe case ID');
  });

  it('injects fixed case requirements without marking the draft publishable', () => {
    const draft = renderTrajectoryDraft(
      '# Agent Trajectory: [Case ID and Outcome]\n\nPublication status: DRAFT\n\n`[case-id]`\n\nInclude the exact synthetic case request, planned acceptance criteria, and the relevant redacted `AGENTS.md` instructions. Link to the tracked case definition.\n',
      evaluationCase,
    );
    expect(draft).toContain('safe-case: pull-request');
    expect(draft).toContain('Add a safe feature.');
    expect(draft).toContain('The safe feature works.');
    expect(draft).toContain('Publication status: DRAFT');
  });
});
