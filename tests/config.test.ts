import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const valid = {
  NODE_ENV: 'test',
  SLACK_BOT_TOKEN: 'xoxb-test',
  SLACK_APP_TOKEN: 'xapp-test',
  SLACK_SIGNING_SECRET: 'secret',
  GITHUB_APP_ID: '1',
  GITHUB_INSTALLATION_ID: '2',
  GITHUB_PRIVATE_KEY: 'line1\\nline2',
  GITHUB_WEBHOOK_SECRET: 'webhook',
  DATABASE_PATH: ':memory:',
  ALLOWED_REPOSITORIES: 'owner/repo,team/project',
};

describe('loadConfig', () => {
  it('validates and normalizes configuration', () => {
    const config = loadConfig(valid);
    expect(config.githubPrivateKey).toBe('line1\nline2');
    expect(config.allowedRepositories.has('owner/repo')).toBe(true);
  });

  it('fails fast with field names when required values are absent', () => {
    expect(() => loadConfig({})).toThrow(/SLACK_BOT_TOKEN/);
  });
});
