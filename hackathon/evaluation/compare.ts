import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  compareEvaluations,
  parseEvaluationSummary,
  parseRunManifest,
  renderComparisonReport,
} from './evaluation.js';

async function main(): Promise<void> {
  const resultsDirectory = resolve(
    process.argv[2] ?? resolve(import.meta.dirname, '..', 'results'),
  );
  const readJson = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(resolve(resultsDirectory, name), 'utf8'));
  const comparison = compareEvaluations(
    parseRunManifest(await readJson('baseline-manifest.json')),
    parseEvaluationSummary(await readJson('baseline-summary.json')),
    parseRunManifest(await readJson('final-manifest.json')),
    parseEvaluationSummary(await readJson('final-summary.json')),
  );
  await mkdir(resultsDirectory, { recursive: true });
  await writeFile(
    resolve(resultsDirectory, 'comparison-summary.json'),
    `${JSON.stringify(comparison, null, 2)}\n`,
  );
  await writeFile(
    resolve(resultsDirectory, 'comparison-report.md'),
    renderComparisonReport(comparison),
  );
  console.log(
    comparison.complete && comparison.comparable
      ? 'Comparison is complete and controlled.'
      : 'Comparison generated, but final claims remain pending.',
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Evaluation comparison failed');
  process.exitCode = 1;
});
