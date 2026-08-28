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
});
