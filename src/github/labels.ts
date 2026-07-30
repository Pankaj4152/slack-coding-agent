import type { Octokit } from '@octokit/rest';

export const agentLabels = {
  'agent-ready': ['Agent task is ready to run', '1d76db'],
  'agent-working': ['Agent workflow is running', 'fbca04'],
  'agent-needs-input': ['Agent requires human clarification', 'd93f0b'],
  'agent-pr-created': ['Agent opened a pull request', '0e8a16'],
  'agent-failed': ['Agent workflow failed', 'b60205'],
} as const;

export async function ensureAgentLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  for (const [name, [description, color]] of Object.entries(agentLabels)) {
    try {
      await octokit.rest.issues.getLabel({ owner, repo, name });
    } catch (error: any) {
      if (error?.status !== 404) throw error;
      try {
        await octokit.rest.issues.createLabel({ owner, repo, name, description, color });
      } catch (createError: any) {
        if (createError?.status !== 422) throw createError;
      }
    }
  }
}

export async function replaceAgentLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  add: string,
  remove: string[],
): Promise<void> {
  await octokit.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: [add] });
  await Promise.all(
    remove.map(async (name) => {
      try {
        await octokit.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name });
      } catch (error: any) {
        if (error?.status !== 404) throw error;
      }
    }),
  );
}
