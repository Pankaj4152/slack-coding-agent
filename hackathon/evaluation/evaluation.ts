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

export const observationSchema = z
  .object({
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
    elapsedMinutes: z.number().nonnegative().default(0),
    humanMinutes: z.number().nonnegative(),
    costUsd: z.number().nonnegative(),
    providerInvocations: z.number().int().nonnegative().default(0),
    repairAttempted: z.boolean().default(false),
    recoveredByRepair: z.boolean().default(false),
    notes: z.string(),
  })
  .refine((value) => !value.recoveredByRepair || value.repairAttempted, {
    message: 'recoveredByRepair requires repairAttempted',
  });

export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type Observation = z.infer<typeof observationSchema>;

export const runManifestSchema = z.object({
  runId: z.string().min(1),
  workflow: z.enum(['baseline', 'final']),
  applicationCommit: z.string().regex(/^[0-9a-f]{7,40}$/i),
  caseFileCommit: z.string().regex(/^[0-9a-f]{7,40}$/i),
  provider: z.enum(['codex', 'gemini']),
  model: z.string().min(1),
  providerTier: z.string().min(1),
  runner: z.string().min(1),
  nodeVersion: z.string().min(1),
  startedAtUtc: z.string().datetime({ offset: true }),
  timeoutMinutesPerAttempt: z.number().int().positive(),
  maximumAttemptsPerCase: z.number().int().positive(),
  targetRepository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  startingCommit: z.string().regex(/^[0-9a-f]{7,40}$/i),
  pricingSourceAndDate: z.string().min(1),
  controlledDifferences: z.array(z.string().min(1)),
  notes: z.string(),
});

export type RunManifest = z.infer<typeof runManifestSchema>;

export interface CaseScore {
  caseId: string;
  verified: boolean;
  reasons: string[];
}

export interface EvaluationSummary {
  totalCases: number;
  completedCases: number;
  pendingCases: number;
  verifiedCases: number;
  verifiedCompletionRate: number;
  firstAttemptSuccessRate: number;
  clarificationPrecision: number;
  averageElapsedMinutes: number;
  totalHumanMinutes: number;
  humanMinutesPerTask: number;
  totalCostUsd: number;
  costPerTaskUsd: number;
  totalProviderInvocations: number;
  providerInvocationsPerTask: number;
  repairAttempts: number;
  repairRecoveries: number;
  repairRecoveryRate: number;
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

export function parseRunManifest(value: unknown): RunManifest {
  return runManifestSchema.parse(value);
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
    elapsedMinutes: 0,
    humanMinutes: 0,
    costUsd: 0,
    providerInvocations: 0,
    repairAttempted: false,
    recoveredByRepair: false,
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
  const completed = observations.filter((item) => item.observedOutcome !== 'not-run');
  const observedClarifications = completed.filter(
    (item) => item.observedOutcome === 'clarification',
  );
  const correctClarifications = observedClarifications.filter(
    (item) => cases.find((candidate) => candidate.id === item.caseId)?.requiresClarification,
  );
  const repairAttempts = completed.filter((item) => item.repairAttempted);
  const repairRecoveries = repairAttempts.filter((item) => item.recoveredByRepair);
  const totalHumanMinutes = round(completed.reduce((sum, item) => sum + item.humanMinutes, 0));
  const totalCostUsd = round(completed.reduce((sum, item) => sum + item.costUsd, 0));
  const totalProviderInvocations = completed.reduce(
    (sum, item) => sum + item.providerInvocations,
    0,
  );

  return {
    totalCases: cases.length,
    completedCases: completed.length,
    pendingCases: cases.length - completed.length,
    verifiedCases: verified.length,
    verifiedCompletionRate: rate(verified.length, cases.length),
    firstAttemptSuccessRate: rate(firstAttemptVerified.length, cases.length),
    clarificationPrecision: rate(correctClarifications.length, observedClarifications.length),
    averageElapsedMinutes: average(completed.map((item) => item.elapsedMinutes)),
    totalHumanMinutes,
    humanMinutesPerTask: average(completed.map((item) => item.humanMinutes)),
    totalCostUsd,
    costPerTaskUsd: average(completed.map((item) => item.costUsd)),
    totalProviderInvocations,
    providerInvocationsPerTask: average(completed.map((item) => item.providerInvocations)),
    repairAttempts: repairAttempts.length,
    repairRecoveries: repairRecoveries.length,
    repairRecoveryRate: rate(repairRecoveries.length, repairAttempts.length),
    cases: scores,
  };
}

export function renderMarkdownReport(manifest: RunManifest, summary: EvaluationSummary): string {
  const differences =
    manifest.controlledDifferences.length === 0
      ? 'None recorded.'
      : manifest.controlledDifferences.map((item) => `- ${item}`).join('\n');
  const caseRows = summary.cases
    .map((item) => {
      const reasons = item.reasons.length === 0 ? 'Verified' : item.reasons.join('; ');
      return `| ${escapeTable(item.caseId)} | ${item.verified ? 'PASS' : 'FAIL'} | ${escapeTable(reasons)} |`;
    })
    .join('\n');

  return `# ${manifest.workflow === 'baseline' ? 'Baseline' : 'Final'} Evaluation Report

## Run conditions

| Field | Value |
| --- | --- |
| Run ID | ${escapeTable(manifest.runId)} |
| Application commit | \`${manifest.applicationCommit}\` |
| Case-file commit | \`${manifest.caseFileCommit}\` |
| Provider | ${manifest.provider} |
| Model | ${escapeTable(manifest.model)} |
| Provider tier | ${escapeTable(manifest.providerTier)} |
| Runner | ${escapeTable(manifest.runner)} |
| Node.js | ${escapeTable(manifest.nodeVersion)} |
| Started at | ${manifest.startedAtUtc} |
| Timeout per attempt | ${manifest.timeoutMinutesPerAttempt} minutes |
| Maximum attempts per case | ${manifest.maximumAttemptsPerCase} |
| Target repository | ${escapeTable(manifest.targetRepository)} |
| Starting commit | \`${manifest.startingCommit}\` |
| Pricing source/date | ${escapeTable(manifest.pricingSourceAndDate)} |

## Aggregate results

| Metric | Result |
| --- | ---: |
| Verified completion | ${summary.verifiedCases}/${summary.totalCases} (${summary.verifiedCompletionRate}%) |
| Cases executed | ${summary.completedCases}/${summary.totalCases} (${summary.pendingCases} pending) |
| First-attempt success rate | ${summary.firstAttemptSuccessRate}% |
| Clarification precision | ${summary.clarificationPrecision}% |
| Average elapsed time | ${summary.averageElapsedMinutes} minutes |
| Human time per task | ${summary.humanMinutesPerTask} minutes |
| Provider invocations per task | ${summary.providerInvocationsPerTask} |
| Estimated provider cost per task | $${summary.costPerTaskUsd.toFixed(2)} |
| Repair recovery | ${summary.repairRecoveries}/${summary.repairAttempts} (${summary.repairRecoveryRate}%) |

## Per-case results

| Case | Result | Evidence gap or failure reason |
| --- | --- | --- |
${caseRows}

## Controlled differences

${differences}

## Notes

${manifest.notes.trim() || 'None recorded.'}
`;
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

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
