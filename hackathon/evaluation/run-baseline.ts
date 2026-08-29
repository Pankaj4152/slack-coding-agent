import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
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
const defaultObservationsPath = resolve(root, 'hackathon', 'results', 'baseline-observations.json');
const defaultSummaryPath = resolve(root, 'hackathon', 'results', 'baseline-summary.json');
const defaultManifestPath = resolve(root, 'hackathon', 'results', 'baseline-manifest.json');
const defaultReportPath = resolve(root, 'hackathon', 'results', 'baseline-report.md');

async function main(): Promise<void> {
  const cases = parseCases(JSON.parse(await readFile(casesPath, 'utf8')));
  const args = process.argv.slice(2);

  if (args[0] === 'init') {
    const outputPath = resolve(args[1] ?? defaultObservationsPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(createObservationTemplate(cases), null, 2)}\n`, {
      flag: 'wx',
    });
    console.log(`Created baseline observation template: ${outputPath}`);
    return;
  }

  const observationsPath = resolve(args[0] ?? defaultObservationsPath);
  const summaryPath = resolve(args[1] ?? defaultSummaryPath);
  const manifestPath = resolve(args[2] ?? defaultManifestPath);
  const reportPath = resolve(args[3] ?? defaultReportPath);
  const observations = parseObservations(JSON.parse(await readFile(observationsPath, 'utf8')));
  const manifest = parseRunManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const summary = evaluate(cases, observations);
  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderMarkdownReport(manifest, summary));

  console.log(
    `Verified ${summary.verifiedCases}/${summary.totalCases} cases (${summary.verifiedCompletionRate}%).`,
  );
  console.log(`Summary written to: ${summaryPath}`);
  console.log(`Markdown report written to: ${reportPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Baseline evaluation failed');
  process.exitCode = 1;
});
