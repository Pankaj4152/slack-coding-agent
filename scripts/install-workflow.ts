import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Usage: npx tsx scripts/install-workflow.ts <target-repository-path>');
  process.exit(1);
}
const root = resolve(target);
if (!existsSync(root)) throw new Error(`Target path does not exist: ${root}`);
mkdirSync(resolve(root, '.github/workflows'), { recursive: true });
copyFileSync(
  resolve('templates/coding-agent.yml'),
  resolve(root, '.github/workflows/coding-agent.yml'),
);
if (!existsSync(resolve(root, 'AGENTS.md'))) {
  copyFileSync(resolve('templates/AGENTS.md'), resolve(root, 'AGENTS.md'));
}
console.log(`Installed workflow in ${root}; review and commit the generated files.`);
