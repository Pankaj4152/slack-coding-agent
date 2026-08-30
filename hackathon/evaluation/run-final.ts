import { runEvaluationCli } from './runner.js';

runEvaluationCli('final').catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Final evaluation failed');
  process.exitCode = 1;
});
