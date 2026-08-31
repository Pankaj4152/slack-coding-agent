import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('coding agent workflow template', () => {
  const template = readFileSync('templates/coding-agent.yml', 'utf8');
  const activeWorkflow = readFileSync('.github/workflows/coding-agent.yml', 'utf8');

  it('keeps the active workflow synchronized with the installable template', () => {
    expect(activeWorkflow).toBe(template);
  });

  it('supports Codex by default and Gemini 2.5 Flash by selection', () => {
    expect(template).toContain("AGENT_PROVIDER: ${{ vars.CODING_AGENT_PROVIDER || 'codex' }}");
    expect(template).toContain("if: env.AGENT_PROVIDER == 'codex'");
    expect(template.match(/codex-home: \$\{\{ runner\.temp \}\}\/probe-codex-home-/g)).toHaveLength(
      5,
    );
    expect(new Set(template.match(/probe-codex-home-[a-z-]+/g)).size).toBe(5);
    expect(template).toContain('steps.codex.outputs.final-message');
    expect(template).toContain('Codex Action runtime or sandbox error');
    expect(template).toContain("if: env.AGENT_PROVIDER == 'gemini'");
    expect(template).toContain('uses: google-github-actions/run-gemini-cli@v0');
    expect(template).toContain('gemini_model: gemini-2.5-flash');
    expect(template.match(/GEMINI_CLI_TRUST_WORKSPACE: 'true'/g)).toHaveLength(5);
    expect(
      template.match(/GEMINI_CLI_HOME: \$\{\{ runner\.temp \}\}\/probe-gemini-home-/g),
    ).toHaveLength(5);
    expect(new Set(template.match(/probe-gemini-home-[a-z-]+/g)).size).toBe(5);
    expect(template).toContain('Gemini CLI rejected the GitHub Actions checkout as untrusted.');
    // GEMINI_ERROR must be exposed in ALL 5 normalize steps so error classifiers work
    expect(
      template.match(/GEMINI_ERROR: \$\{\{ steps\.[a-z_]+\.outputs\.error \}\}/g),
    ).toHaveLength(5);
    // Gemini model/quota/auth error patterns must appear in all normalize steps
    expect(template.match(/invalid\.\*model\|model\.\*not\.\*found/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it('fails fast with actionable target repository configuration diagnostics', () => {
    expect(template).toContain('name: Validate target repository configuration');
    expect(template).toContain('OPENAI_KEY_PRESENT');
    expect(template).toContain('GEMINI_KEY_PRESENT');
    expect(template).toContain('Add GEMINI_API_KEY under target repository Settings');
    expect(template).toContain('Add Actions variable CODING_AGENT_APPROVAL_BOT_LOGIN');
    expect(template).toContain('AGENTS.md is missing from the target repository root');
    expect(template).toContain('Target repository configuration is incomplete:');
  });

  it('accepts canonical repository casing and only trusts the configured app bot', () => {
    expect(template).toContain(
      'metadata.repository.toLowerCase() !== process.env.REPOSITORY.toLowerCase()',
    );
    expect(
      template.match(/allow-bot-users: \$\{\{ vars\.CODING_AGENT_APPROVAL_BOT_LOGIN \}\}/g),
    ).toHaveLength(5);
    expect(template).toContain('APPROVAL_BOT_LOGIN: ${{ vars.CODING_AGENT_APPROVAL_BOT_LOGIN }}');
    expect(template).not.toContain('pankaj-slack-coding-agent[bot]');
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
    expect(template).toContain(
      "'\\n.gemini/\\ngemini-artifacts/\\ngha-creds-*.json\\n'",
    );
    expect(template).toContain("['status', '--porcelain', '--', ':!.codex-task']");
    expect(template).toContain("console.error('Planner workspace changes:'");
  });

  it('optionally requires requester approval bound to the exact plan', () => {
    expect(template).toContain('CODING_AGENT_REQUIRE_APPROVAL');
    expect(template).toContain('CODING_AGENT_APPROVAL_BOT_LOGIN');
    expect(template).toContain('name: Check plan approval');
    expect(template).toContain('name: Request plan approval');
    expect(template).toContain('<!-- agent-approval-required plan-sha256=');
    expect(template).toContain('agent-approved\\s+plan-sha256=');
    expect(template).toContain('name: Restore an approved plan snapshot');
    expect(template).toContain('agent-plan-snapshot\\s+plan-sha256=');
    expect(template).toContain("steps.restored_plan.outputs.restored != 'true'");
    expect(template).toContain("process.env.RESTORED_PLAN === 'true' ? 'success'");
    expect(template).toContain("steps.approval.outputs.approved == 'true'");
    expect(template.indexOf('name: Check plan approval')).toBeLessThan(
      template.indexOf('\n      - name: Run Codex\n'),
    );
  });

  it('does not code or report failure after clarification or cancellation', () => {
    expect(template).toContain(
      "if: env.AGENT_PROVIDER == 'codex' && steps.planner.outputs.status == 'READY' && steps.approval.outputs.approved == 'true' && steps.planner_cancel.outputs.cancelled != 'true'",
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
    // Verifier normalize must expose GEMINI_ERROR and classify it
    expect(template).toContain("GEMINI_ERROR: ${{ steps.verifier_gemini.outputs.error }}");
    expect(template).toContain('verifier could not complete its review.');
  });

  it('reports verification evidence to Slack and the PR', () => {
    expect(template).toContain('<!-- agent-coding -->');
    expect(template).toContain('<!-- agent-validating -->');
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
    expect(template.match(/^ {6}- name: Run Codex repair$/gm)).toHaveLength(1);
    expect(template.match(/^ {6}- name: Run Gemini repair$/gm)).toHaveLength(1);
    expect(template).toContain("if: steps.verifier.outputs.status == 'NEEDS_FIX'");
    expect(template).toContain("steps.repair_result.outputs.status != 'NEEDS_CLARIFICATION'");
    // Repair normalize steps must expose GEMINI_ERROR and classify it
    expect(template).toContain("GEMINI_ERROR: ${{ steps.repair_gemini.outputs.error }}");
    expect(template).toContain("GEMINI_ERROR: ${{ steps.repair_verifier_gemini.outputs.error }}");
    expect(template).toContain('repair agent could not complete the bounded repair attempt.');
    expect(template).toContain('repair verifier could not complete its review.');
    // Report failure must also clean up the agent-pr-created label
    expect(template).toContain('labels/agent-pr-created');
  });
});
