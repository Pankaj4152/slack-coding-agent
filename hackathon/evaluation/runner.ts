import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createObservationTemplate,
  evaluate,
  parseCases,
  parseObservations,
  parseRunManifest,
  renderMarkdownReport,
} from './evaluation.js';

const root = resolve(import.meta.dirname, '..', '..');
const casesPath = resolve(import.meta.dirname, 'cases.json');

export async function runEvaluationCli(workflow: 'baseline' | 'final'): Promise<void> {
  const cases = parseCases(JSON.parse(await readFile(casesPath, 'utf8')));
  const args = process.argv.slice(2);
  const resultsDirectory = resolve(args[1] ?? resolve(root, 'hackathon', 'results'));
  const observationsPath = resolve(resultsDirectory, `${workflow}-observations.json`);
  const summaryPath = resolve(resultsDirectory, `${workflow}-summary.json`);
  const manifestPath = resolve(resultsDirectory, `${workflow}-manifest.json`);
  const reportPath = resolve(resultsDirectory, `${workflow}-report.md`);

  if (args[0] === 'init') {
    await mkdir(resultsDirectory, { recursive: true });
    await writeFile(
      observationsPath,
      `${JSON.stringify(createObservationTemplate(cases), null, 2)}\n`,
      { flag: 'wx' },
    );
    console.log(`Created ${workflow} observation template: ${observationsPath}`);
    return;
  }
  if (args[0] && args[0] !== 'report') {
    throw new Error('Usage: init [results-directory] or report [results-directory]');
  }

  const observations = parseObservations(JSON.parse(await readFile(observationsPath, 'utf8')));
  const manifest = parseRunManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  if (manifest.workflow !== workflow) {
    throw new Error(`Expected a ${workflow} manifest, received ${manifest.workflow}`);
  }
  const summary = evaluate(cases, observations);
  await mkdir(resultsDirectory, { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(reportPath, renderMarkdownReport(manifest, summary));

  console.log(
    `Verified ${summary.verifiedCases}/${summary.totalCases} cases (${summary.verifiedCompletionRate}%).`,
  );
  console.log(
    `Executed ${summary.completedCases}/${summary.totalCases}; ${summary.pendingCases} pending.`,
  );
  console.log(`Summary written to: ${summaryPath}`);
  console.log(`Markdown report written to: ${reportPath}`);
}
