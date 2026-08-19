export const taskStatuses = [
  'creating',
  'ready',
  'working',
  'needs_input',
  'pr_created',
  'failed',
  'cancelled',
  'completed',
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export interface Task {
  id: string;
  workspaceId: string;
  channelId: string;
  threadTs: string;
  requesterUserId: string;
  repositoryOwner: string;
  repositoryName: string;
  githubIssueNumber: number;
  status: TaskStatus;
  lastAgentQuestionCommentId: number | null;
  createdAt: string;
  updatedAt: string;
}
