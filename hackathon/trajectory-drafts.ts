import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCases, type EvaluationCase } from './evaluation/evaluation.js';

const representativeCaseIds = [
  'health-build-metadata',
  'ambiguous-retry-policy',
  'validation-repair',
  'cancel-running-task',
];

export function draftFileName(caseId: string): string {
  if (!/^[a-z0-9-]+$/.test(caseId)) throw new Error(`Unsafe case ID: ${caseId}`);
  return `${caseId}-trajectory.md`;
}

export function renderTrajectoryDraft(template: string, evaluationCase: EvaluationCase): string {
  const criteria = evaluationCase.acceptanceCriteria.map((item) => `- ${item}`).join('\n');
  const checks = evaluationCase.requiredChecks.length
    ? evaluationCase.requiredChecks.map((item) => `- \`${item}\``).join('\n')
    : '- None declared for this case.';
  return template
    .replace('[Case ID and Outcome]', `${evaluationCase.id}: ${evaluationCase.expectedOutcome}`)
    .replace('`[case-id]`', `\`${evaluationCase.id}\``)
    .replace(
      'Include the exact synthetic case request, planned acceptance criteria, and the relevant redacted `AGENTS.md` instructions. Link to the tracked case definition.',
      `Exact request:\n\n> ${evaluationCase.request}\n\nPredeclared acceptance criteria:\n\n${criteria}\n\nRequired checks:\n\n${checks}\n\nAdd the relevant redacted \`AGENTS.md\` instructions and link this capture to the tracked case definition.`,
    )
    .concat(
      `\n## Capture focus for this case\n\nExpected outcome: \`${evaluationCase.expectedOutcome}\`. Clarification required: ${evaluationCase.requiresClarification}. Repository changes allowed: ${evaluationCase.allowsRepositoryChanges}. Replace every remaining bracketed field with redacted measured evidence before publication.\n`,
    );
}

async function main(): Promise<void> {
  const root = resolve(import.meta.dirname, '..');
  const cases = parseCases(
    JSON.parse(await readFile(resolve(root, 'hackathon', 'evaluation', 'cases.json'), 'utf8')),
  );
  const requested = process.argv.slice(2);
  const selectedIds = requested.length ? requested : representativeCaseIds;
  const selected = selectedIds.map((id) => {
    const evaluationCase = cases.find((item) => item.id === id);
    if (!evaluationCase) throw new Error(`Unknown evaluation case: ${id}`);
    return evaluationCase;
  });
  const template = await readFile(
    resolve(root, 'hackathon', 'trajectories', 'TRAJECTORY_TEMPLATE.md'),
    'utf8',
  );
  const outputDirectory = resolve(root, 'hackathon', 'results', 'trajectory-drafts');
  await mkdir(outputDirectory, { recursive: true });
  for (const evaluationCase of selected) {
    const path = resolve(outputDirectory, draftFileName(evaluationCase.id));
    try {
      await writeFile(path, renderTrajectoryDraft(template, evaluationCase), { flag: 'wx' });
      console.log(`Created trajectory draft: ${path}`);
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
      console.log(`Preserved existing trajectory draft: ${path}`);
    }
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Trajectory draft generation failed');
    process.exitCode = 1;
  });
}
