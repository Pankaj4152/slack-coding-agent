import { describe, expect, it } from 'vitest';
import {
  compareEvaluations,
  createObservationTemplate,
  evaluate,
  parseCases,
  parseObservations,
  parseRunManifest,
  renderComparisonReport,
  renderMarkdownReport,
  type EvaluationCase,
  type Observation,
  type RunManifest,
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

const manifest: RunManifest = {
  runId: 'baseline-20260829-01',
  workflow: 'baseline',
  applicationCommit: '63ff730',
  caseFileCommit: '7bd9369',
  provider: 'codex',
  model: 'provider-default',
  providerTier: 'paid',
  runner: 'ubuntu-latest',
  nodeVersion: '20.19.0',
  startedAtUtc: '2026-08-29T00:00:00Z',
  timeoutMinutesPerAttempt: 60,
  maximumAttemptsPerCase: 1,
  targetRepository: 'synthetic-owner/synthetic-repository',
  startingCommit: '1234567',
  pricingSourceAndDate: 'Provider pricing page, 2026-08-29',
  controlledDifferences: [],
  notes: '',
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
    elapsedMinutes: 8,
    humanMinutes: 2,
    costUsd: 0.12,
    providerInvocations: 3,
    repairAttempted: false,
    recoveredByRepair: false,
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
      completedCases: 1,
      pendingCases: 0,
      averageElapsedMinutes: 8,
      providerInvocationsPerTask: 3,
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
    expect(() => parseRunManifest({ ...manifest, provider: 'unknown' })).toThrow();
  });

  it('renders aggregate and per-case results as Markdown', () => {
    const report = renderMarkdownReport(
      manifest,
      evaluate([evaluationCase], [passingObservation()]),
    );
    expect(report).toContain('# Baseline Evaluation Report');
    expect(report).toContain('1/1 (100%)');
    expect(report).toContain('| case-1 | PASS | Verified |');
  });

  it('compares complete controlled runs and reports metric deltas', () => {
    const baseline = evaluate([evaluationCase], [passingObservation({ costUsd: 0.1 })]);
    const final = evaluate(
      [evaluationCase],
      [passingObservation({ costUsd: 0.2, providerInvocations: 5 })],
    );
    const comparison = compareEvaluations(
      manifest,
      baseline,
      { ...manifest, workflow: 'final', applicationCommit: 'abcdef0' },
      final,
    );
    expect(comparison).toMatchObject({
      complete: true,
      comparable: true,
      change: { costPerTaskUsd: 0.1, providerInvocationsPerTask: 2 },
    });
    expect(renderComparisonReport(comparison)).toContain('Complete and directly comparable.');
  });

  it('flags controlled mismatches and incomplete runs', () => {
    const pending = evaluate([evaluationCase], createObservationTemplate([evaluationCase]));
    const comparison = compareEvaluations(
      manifest,
      pending,
      { ...manifest, workflow: 'final', model: 'different-model' },
      pending,
    );
    expect(comparison.complete).toBe(false);
    expect(comparison.comparable).toBe(false);
    expect(comparison.controlledMismatches[0]).toContain('model');
    expect(renderComparisonReport(comparison)).toContain('Pending:');
  });
});
