import type { Octokit } from '@octokit/rest';
import { ensureAgentLabels } from './labels.js';

export interface IssueMetadata {
  taskId: string;
  workspaceId: string;
  channelId: string;
  threadTs: string;
  requesterUserId: string;
  repository: string;
}

export function buildIssueBody(task: string, metadata: IssueMetadata): string {
  const safeTask = escapeMetadataSentinels(task.trim());
  const safeMetadata = JSON.stringify(metadata, null, 2).replace(/-->/g, '--\\u003e');
  return `## Requested task

${safeTask}

## Requested by

Slack user: \`<@${metadata.requesterUserId}>\`

## Agent instructions

- Implement only the requested change.
- Follow applicable \`AGENTS.md\` instructions and existing repository patterns.
- Add or update tests for behavioral changes and run documented validation commands.
- Do not add dependencies unless clearly required.
- Do not modify infrastructure, deployment, authentication, authorization, billing, or secrets unless explicitly requested.
- Ask for clarification instead of making a material product decision.
- Never merge the pull request.

## Slack task metadata

<!-- slack-agent-metadata
${safeMetadata}
-->
`;
}

function escapeMetadataSentinels(value: string): string {
  return value
    .replace(/<!--\s*slack-agent-metadata/gi, '&lt;!-- slack-agent-metadata')
    .replace(/-->/g, '--&gt;');
}

export async function createAgentIssue(
  octokit: Octokit,
  input: { owner: string; repo: string; task: string; metadata: IssueMetadata },
): Promise<number> {
  await ensureAgentLabels(octokit, input.owner, input.repo);
  const titleTask = input.task.split(/\r?\n/, 1)[0]!.trim().slice(0, 220);
  const response = await octokit.rest.issues.create({
    owner: input.owner,
    repo: input.repo,
    title: `[Agent] ${titleTask}`,
    body: buildIssueBody(input.task, input.metadata),
    labels: ['agent-ready'],
  });
  return response.data.number;
}
