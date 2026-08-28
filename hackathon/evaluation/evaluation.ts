import { z } from 'zod';

export const outcomeSchema = z.enum([
  'pull-request',
  'clarification',
  'no-change',
  'escalation',
  'retry',
  'cancelled',
  'failed',
  'not-run',
]);

export const evaluationCaseSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  request: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  requiredChecks: z.array(z.string().min(1)),
  expectedOutcome: outcomeSchema.exclude(['failed', 'not-run']),
  requiresClarification: z.boolean(),
  allowsRepositoryChanges: z.boolean(),
});

export const observationSchema = z.object({
  caseId: z.string().min(1),
  observedOutcome: outcomeSchema,
  acceptanceEvidence: z.array(
    z.object({
      criterion: z.string().min(1),
      passed: z.boolean(),
      evidence: z.string(),
    }),
  ),
  checks: z.array(
    z.object({
      command: z.string().min(1),
      passed: z.boolean(),
      evidence: z.string(),
    }),
  ),
  repositoryChanged: z.boolean(),
  firstAttempt: z.boolean(),
  humanMinutes: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
  notes: z.string(),
});

export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type Observation = z.infer<typeof observationSchema>;

export interface CaseScore {
  caseId: string;
  verified: boolean;
  reasons: string[];
}

export interface EvaluationSummary {
  totalCases: number;
  verifiedCases: number;
  verifiedCompletionRate: number;
  firstAttemptSuccessRate: number;
  totalHumanMinutes: number;
  totalCostUsd: number;
  cases: CaseScore[];
}

export function parseCases(value: unknown): EvaluationCase[] {
  const cases = z.array(evaluationCaseSchema).min(1).parse(value);
  assertUnique(
    cases.map((item) => item.id),
    'case ID',
  );
  return cases;
}

export function parseObservations(value: unknown): Observation[] {
  const observations = z.array(observationSchema).parse(value);
  assertUnique(
    observations.map((item) => item.caseId),
    'observation case ID',
  );
  return observations;
}

export function createObservationTemplate(cases: EvaluationCase[]): Observation[] {
  return cases.map((evaluationCase) => ({
    caseId: evaluationCase.id,
    observedOutcome: 'not-run',
    acceptanceEvidence: evaluationCase.acceptanceCriteria.map((criterion) => ({
      criterion,
      passed: false,
      evidence: '',
    })),
    checks: evaluationCase.requiredChecks.map((command) => ({
      command,
      passed: false,
      evidence: '',
    })),
    repositoryChanged: false,
    firstAttempt: false,
    humanMinutes: 0,
    costUsd: 0,
    notes: '',
  }));
}

export function evaluate(cases: EvaluationCase[], observations: Observation[]): EvaluationSummary {
  const observationsByCase = new Map(observations.map((item) => [item.caseId, item]));
  const knownCaseIds = new Set(cases.map((item) => item.id));
  const unknownIds = observations.filter((item) => !knownCaseIds.has(item.caseId));
  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown observation case IDs: ${unknownIds.map((item) => item.caseId).join(', ')}`,
    );
  }

  const scores = cases.map((evaluationCase) =>
    scoreCase(evaluationCase, observationsByCase.get(evaluationCase.id)),
  );
  const verified = scores.filter((item) => item.verified);
  const firstAttemptVerified = verified.filter(
    (score) => observationsByCase.get(score.caseId)?.firstAttempt,
  );

  return {
    totalCases: cases.length,
    verifiedCases: verified.length,
    verifiedCompletionRate: rate(verified.length, cases.length),
    firstAttemptSuccessRate: rate(firstAttemptVerified.length, cases.length),
    totalHumanMinutes: observations.reduce((sum, item) => sum + item.humanMinutes, 0),
    totalCostUsd: round(observations.reduce((sum, item) => sum + item.costUsd, 0)),
    cases: scores,
  };
}

function scoreCase(evaluationCase: EvaluationCase, observation?: Observation): CaseScore {
  const reasons: string[] = [];
  if (!observation)
    return { caseId: evaluationCase.id, verified: false, reasons: ['Missing observation'] };
  if (observation.observedOutcome !== evaluationCase.expectedOutcome) {
    reasons.push(
      `Expected outcome ${evaluationCase.expectedOutcome}, observed ${observation.observedOutcome}`,
    );
  }
  if (!evaluationCase.allowsRepositoryChanges && observation.repositoryChanged) {
    reasons.push('Repository changed when changes were not allowed');
  }

  for (const criterion of evaluationCase.acceptanceCriteria) {
    const evidence = observation.acceptanceEvidence.find((item) => item.criterion === criterion);
    if (!evidence) reasons.push(`Missing acceptance evidence: ${criterion}`);
    else if (!evidence.passed) reasons.push(`Acceptance criterion failed: ${criterion}`);
    else if (!evidence.evidence.trim()) reasons.push(`Acceptance evidence is empty: ${criterion}`);
  }
  for (const command of evaluationCase.requiredChecks) {
    const check = observation.checks.find((item) => item.command === command);
    if (!check) reasons.push(`Missing required check: ${command}`);
    else if (!check.passed) reasons.push(`Required check failed: ${command}`);
    else if (!check.evidence.trim()) reasons.push(`Required check evidence is empty: ${command}`);
  }

  return { caseId: evaluationCase.id, verified: reasons.length === 0, reasons };
}

function assertUnique(values: string[], label: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0)
    throw new Error(`Duplicate ${label}: ${[...new Set(duplicates)].join(', ')}`);
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round((numerator / denominator) * 100);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
