import { describe, expect, it } from 'vitest';
import {
  createObservationTemplate,
  evaluate,
  parseCases,
  parseObservations,
  type EvaluationCase,
  type Observation,
} from './evaluation.js';

const evaluationCase: EvaluationCase = {
  id: 'case-1',
  category: 'feature',
  request: 'Add behavior.',
  acceptanceCriteria: ['Behavior exists.'],
  requiredChecks: ['npm test'],
  expectedOutcome: 'pull-request',
  requiresClarification: false,
  allowsRepositoryChanges: true,
};

function passingObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    caseId: 'case-1',
    observedOutcome: 'pull-request',
    acceptanceEvidence: [
      { criterion: 'Behavior exists.', passed: true, evidence: 'Test assertion passed.' },
    ],
    checks: [{ command: 'npm test', passed: true, evidence: '40 tests passed.' }],
    repositoryChanged: true,
    firstAttempt: true,
    humanMinutes: 2,
    costUsd: 0.12,
    notes: '',
    ...overrides,
  };
}

describe('hackathon evaluation', () => {
  it('creates non-passing templates for every case', () => {
    const template = createObservationTemplate([evaluationCase]);
    expect(template).toEqual([
      expect.objectContaining({ caseId: 'case-1', observedOutcome: 'not-run' }),
    ]);
    expect(evaluate([evaluationCase], template).verifiedCases).toBe(0);
  });

  it('scores a case only when outcome, evidence, and checks pass', () => {
    const summary = evaluate([evaluationCase], [passingObservation()]);
    expect(summary).toMatchObject({
      totalCases: 1,
      verifiedCases: 1,
      verifiedCompletionRate: 100,
      firstAttemptSuccessRate: 100,
      totalHumanMinutes: 2,
      totalCostUsd: 0.12,
    });
  });

  it('rejects empty evidence and disallowed changes', () => {
    const noChangeCase = { ...evaluationCase, allowsRepositoryChanges: false };
    const summary = evaluate(
      [noChangeCase],
      [
        passingObservation({
          acceptanceEvidence: [{ criterion: 'Behavior exists.', passed: true, evidence: '' }],
        }),
      ],
    );
    expect(summary.cases[0]?.reasons).toEqual([
      'Repository changed when changes were not allowed',
      'Acceptance evidence is empty: Behavior exists.',
    ]);
  });

  it('validates schemas and duplicate identifiers', () => {
    expect(() => parseCases([evaluationCase, evaluationCase])).toThrow('Duplicate case ID');
    expect(() => parseObservations([passingObservation(), passingObservation()])).toThrow(
      'Duplicate observation case ID',
    );
  });
});
