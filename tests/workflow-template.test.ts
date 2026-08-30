import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('coding agent workflow template', () => {
  const template = readFileSync('templates/coding-agent.yml', 'utf8');
  const activeWorkflow = readFileSync('.github/workflows/coding-agent.yml', 'utf8');

  it('keeps the active workflow synchronized with the installable template', () => {
    expect(activeWorkflow).toBe(template);
  });

  it('supports Codex by default and Gemini 3.1 Flash-Lite by selection', () => {
    expect(template).toContain("AGENT_PROVIDER: ${{ vars.CODING_AGENT_PROVIDER || 'codex' }}");
    expect(template).toContain("if: env.AGENT_PROVIDER == 'codex'");
    expect(template).toContain("if: env.AGENT_PROVIDER == 'gemini'");
    expect(template).toContain('uses: google-github-actions/run-gemini-cli@v0');
    expect(template).toContain('gemini_model: gemini-3.1-flash-lite');
  });

  it('plans before coding with a shared structured contract', () => {
    expect(template).toContain('name: Run Codex planner');
    expect(template).toContain('name: Run Gemini planner');
    expect(template).toContain('sandbox: read-only');
    expect(template).toContain('"enum": ["READY", "NEEDS_CLARIFICATION", "REJECTED"]');
    expect(template).toContain('name: Normalize planner result');
    expect(template).toContain("if: steps.planner.outputs.status == 'NEEDS_CLARIFICATION'");
    expect(template).toContain('<!-- agent-question -->');
    expect(template).toContain('APPROVED PLAN:');
  });

  it('does not code or report failure after clarification or cancellation', () => {
    expect(template).toContain(
      "if: env.AGENT_PROVIDER == 'codex' && steps.planner.outputs.status == 'READY' && steps.planner_cancel.outputs.cancelled != 'true'",
    );
    expect(template).toContain("steps.planner.outputs.status != 'NEEDS_CLARIFICATION'");
    expect(template).toContain("steps.planner_cancel.outputs.cancelled != 'true'");
    expect(template).toContain('name: Check cancellation before failure reporting');
    expect(template).toContain("steps.final_cancel_check.outputs.cancelled != 'true'");
  });

  it('carries escaped planner evidence into the pull request', () => {
    expect(template).toContain('planner-result-final.json');
    expect(template).toContain('## Planned acceptance criteria');
    expect(template).toContain('## Validation reported by the coding agent');
    expect(template).toContain("replace(/<!--/g, '&lt;!--')");
    expect(template).toContain('<!-- agent-pr task-id=');
  });

  it('runs bounded trusted validation without provider secrets', () => {
    expect(template).toContain('CODING_AGENT_VALIDATION_COMMANDS_JSON');
    expect(template).toContain("['format:check', 'lint', 'typecheck', 'test', 'build']");
    expect(template).toContain('timeout: 600000');
    expect(template).toContain('maxBuffer: 1024 * 1024');
    expect(template).toContain('delete cleanEnv[key]');
    expect(template).toContain('repositoryModifiedByChecks');
    expect(template).toContain("['add', '-N', '--', '.']");
    expect(template).toContain('beforeFingerprint');
    expect(template).toContain('configurationError');
    expect(template).toContain('deterministic-validation.json');
  });

  it('independently verifies every criterion before creating a PR', () => {
    expect(template).toContain('name: Run Codex verifier');
    expect(template).toContain('name: Run Gemini verifier');
    expect(template).toContain('name: Normalize verifier result');
    expect(template).toContain('"enum": ["PASS", "NEEDS_FIX", "FAILED"]');
    expect(template).toContain('exactCoverage');
    expect(template).toContain('criteriaPass');
    expect(template).toContain('pre-verifier-fingerprint.txt');
    expect(template).toContain("steps.final_verification.outputs.status == 'PASS'");
  });

  it('reports verification evidence to Slack and the PR', () => {
    expect(template).toContain('<!-- agent-verification -->');
    expect(template).toContain('Confidence: ${verifier.confidence}%');
    expect(template).toContain('verifier-result-final.json');
    expect(template).toContain('## Independent verification');
    expect(template).toContain('## Deterministic checks');
  });

  it('allows exactly one evidence-driven repair and requires fresh verification', () => {
    expect(template).toContain('name: Run Codex repair');
    expect(template).toContain('name: Run Gemini repair');
    expect(template).toContain('<!-- agent-repair -->');
    expect(template).toContain('attempt-0/verifier-result.json');
    expect(template).toContain('name: Rerun deterministic validation after repair');
    expect(template).toContain('name: Run Codex repair verifier');
    expect(template).toContain('name: Run Gemini repair verifier');
    expect(template).toContain('name: Select final verification outcome');
    expect(template).toContain("steps.final_verification.outputs.status == 'PASS'");
    expect(template).toContain('Recovered after one bounded repair attempt.');
  });
});
