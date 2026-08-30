import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseEvaluationSummary,
  parseObservations,
  parseRunManifest,
} from './evaluation/evaluation.js';

export type ReadinessStatus = 'PASS' | 'PENDING' | 'FAIL';

export interface ReadinessItem {
  area: string;
  status: ReadinessStatus;
  detail: string;
}

export interface ReadinessReport {
  status: ReadinessStatus;
  generatedAtUtc: string;
  counts: Record<ReadinessStatus, number>;
  items: ReadinessItem[];
}

const requiredFiles = [
  'README.md',
  'hackathon/README.md',
  'hackathon/IMPROVEMENT_CHANGELOG.md',
  'hackathon/REPRODUCTION.md',
  'hackathon/VIDEO_SCRIPT.md',
  'hackathon/AGENT_TRAJECTORIES.md',
  'hackathon/JUDGING_MAP.md',
  'hackathon/EVIDENCE_INDEX.md',
  'hackathon/SUBMISSION_CHECKLIST.md',
  'hackathon/evaluation/cases.json',
  'hackathon/evaluation/run-manifest.example.json',
  '.github/workflows/coding-agent.yml',
  'templates/coding-agent.yml',
];

const sensitivePatterns = [
  /\bsk-[A-Za-z0-9_-]{8,}/,
  /\b(?:github_pat_|gh[oprsu]_)[A-Za-z0-9_]{8,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}/,
  /\b(?:postgres(?:ql)?|mysql):\/\/[^\s"@]+:[^\s"@]+@/i,
];
const placeholderLine =
  /placeholder|example\.com|<[^>]+>|\b(?:USER|PASSWORD|HOST|PORT|DATABASE)\b|\.\.\.|accidentally captured|xoxb-test|postgres:password/i;
const privateKeyBlock =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{64,}-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

export function summarizeReadiness(
  items: ReadinessItem[],
  generatedAtUtc = new Date().toISOString(),
): ReadinessReport {
  const counts = { PASS: 0, PENDING: 0, FAIL: 0 } satisfies Record<ReadinessStatus, number>;
  for (const item of items) counts[item.status] += 1;
  return {
    status: counts.FAIL > 0 ? 'FAIL' : counts.PENDING > 0 ? 'PENDING' : 'PASS',
    generatedAtUtc,
    counts,
    items,
  };
}

export function renderReadinessMarkdown(report: ReadinessReport): string {
  const rows = report.items
    .map((item) => `| ${escapeTable(item.area)} | ${item.status} | ${escapeTable(item.detail)} |`)
    .join('\n');
  return `# Submission Readiness Report

Overall status: **${report.status}**

Generated: ${report.generatedAtUtc}

| Status | Count |
| --- | ---: |
| PASS | ${report.counts.PASS} |
| PENDING | ${report.counts.PENDING} |
| FAIL | ${report.counts.FAIL} |

| Area | Status | Detail |
| --- | --- | --- |
${rows}

`;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const results = resolve(root, 'hackathon', 'results');
  const items: ReadinessItem[] = [];

  const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
  items.push({
    area: 'Required deliverables',
    status: missing.length ? 'FAIL' : 'PASS',
    detail: missing.length
      ? `Missing: ${missing.join(', ')}`
      : `${requiredFiles.length} required files exist.`,
  });

  const template = readFileSync(resolve(root, 'templates', 'coding-agent.yml'), 'utf8');
  const active = readFileSync(resolve(root, '.github', 'workflows', 'coding-agent.yml'), 'utf8');
  items.push({
    area: 'Workflow synchronization',
    status: template === active ? 'PASS' : 'FAIL',
    detail:
      template === active
        ? 'Active workflow matches its installable template.'
        : 'Workflow copies differ.',
  });

  assessEvaluation(results, items);
  assessTrajectories(root, items);
  assessPlaceholders(root, items);
  assessTrackedFiles(root, items);

  const report = summarizeReadiness(items);
  writeFileSync(
    resolve(results, 'submission-readiness.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(resolve(results, 'submission-readiness.md'), renderReadinessMarkdown(report));
  console.log(`Submission readiness: ${report.status}`);
  console.log(
    `PASS ${report.counts.PASS} | PENDING ${report.counts.PENDING} | FAIL ${report.counts.FAIL}`,
  );
  console.log(`Report: ${resolve(results, 'submission-readiness.md')}`);
  if (report.status === 'FAIL') process.exitCode = 1;
}

function assessEvaluation(results: string, items: ReadinessItem[]): void {
  const names = ['baseline', 'final'] as const;
  for (const name of names) {
    try {
      const manifest = parseRunManifest(readJson(resolve(results, `${name}-manifest.json`)));
      const observations = parseObservations(
        readJson(resolve(results, `${name}-observations.json`)),
      );
      const summary = parseEvaluationSummary(readJson(resolve(results, `${name}-summary.json`)));
      const validWorkflow = manifest.workflow === name;
      items.push({
        area: `${name} evaluation`,
        status:
          validWorkflow && summary.pendingCases === 0 ? 'PASS' : validWorkflow ? 'PENDING' : 'FAIL',
        detail: validWorkflow
          ? `${observations.length} observations; ${summary.pendingCases} pending cases.`
          : `Manifest workflow is ${manifest.workflow}.`,
      });
    } catch (error) {
      items.push({
        area: `${name} evaluation`,
        status: 'PENDING',
        detail: `Results are not complete and valid: ${message(error)}`,
      });
    }
  }
  try {
    const comparison = readJson(resolve(results, 'comparison-summary.json')) as {
      complete?: boolean;
      comparable?: boolean;
    };
    items.push({
      area: 'Controlled comparison',
      status: comparison.complete && comparison.comparable ? 'PASS' : 'PENDING',
      detail: `complete=${Boolean(comparison.complete)}, comparable=${Boolean(comparison.comparable)}.`,
    });
  } catch (error) {
    items.push({ area: 'Controlled comparison', status: 'PENDING', detail: message(error) });
  }
}

function assessTrajectories(root: string, items: ReadinessItem[]): void {
  const directory = resolve(root, 'hackathon', 'trajectories');
  const captures = readdirSync(directory).filter(
    (name) => name !== 'TRAJECTORY_TEMPLATE.md' && extname(name).toLowerCase() === '.md',
  );
  items.push({
    area: 'Agent trajectories',
    status: captures.length >= 4 ? 'PASS' : 'PENDING',
    detail: `${captures.length} captured trajectory files; at least 4 representative captures expected.`,
  });
}

function assessPlaceholders(root: string, items: ReadinessItem[]): void {
  const files = ['hackathon/VIDEO_SCRIPT.md', 'hackathon/IMPROVEMENT_CHANGELOG.md'];
  const unresolved = files.flatMap((file) => {
    const text = readFileSync(resolve(root, file), 'utf8');
    return (
      text
        .match(
          /\[(?:CASE_ID|BASELINE_[A-Z_]+|FINAL_[A-Z_]+|DELTA|INVOCATIONS|REPAIR_[A-Z_]+|MEASURED_WIN|EVIDENCE)\]/g,
        )
        ?.map((value) => `${file}:${value}`) ?? []
    );
  });
  items.push({
    area: 'Submission placeholders',
    status: unresolved.length ? 'PENDING' : 'PASS',
    detail: unresolved.length
      ? `${unresolved.length} live-result placeholders remain.`
      : 'No final-result placeholders remain.',
  });
}

function assessTrackedFiles(root: string, items: ReadinessItem[]): void {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const forbiddenNames = tracked.filter(
    (name) =>
      name !== '.env.example' && /(^|\/)(?:\.env(?:\..*)?|.*\.(?:sqlite|db|log))$/i.test(name),
  );
  const suspicious: string[] = [];
  for (const name of tracked) {
    try {
      const content = readFileSync(resolve(root, name));
      if (content.includes(0)) continue;
      const text = content.toString('utf8');
      const sensitiveLine = text
        .split(/\r?\n/)
        .filter((line) => !placeholderLine.test(line))
        .some((line) => sensitivePatterns.some((pattern) => pattern.test(line)));
      if (sensitiveLine || privateKeyBlock.test(text)) suspicious.push(name);
    } catch {
      // Unreadable tracked files are handled by Git/repository checks outside the text scanner.
    }
  }
  const failures = [...new Set([...forbiddenNames, ...suspicious])];
  items.push({
    area: 'Tracked secret hygiene',
    status: failures.length ? 'FAIL' : 'PASS',
    detail: failures.length
      ? `Review tracked files: ${failures.join(', ')}`
      : `${tracked.length} tracked files scanned.`,
  });
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
