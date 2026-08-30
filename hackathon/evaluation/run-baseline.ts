import { runEvaluationCli } from './runner.js';

runEvaluationCli('baseline').catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Baseline evaluation failed');
  process.exitCode = 1;
});
