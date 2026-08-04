import { randomUUID } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import type { Logger } from 'pino';
import { createAgentIssue } from '../github/issues.js';
import type { TaskStore } from './task-repository.js';
import type { Task } from './task-types.js';

interface CreateTaskInput {
  workspaceId: string;
  channelId: string;
  threadTs: string;
  requesterUserId: string;
  owner: string;
  repo: string;
  task: string;
}

export class TaskService {
  private readonly inFlight = new Map<string, Promise<Task>>();

  constructor(
    private readonly tasks: TaskStore,
    private readonly github: Octokit,
    private readonly allowedRepositories: ReadonlySet<string>,
    private readonly logger: Logger,
  ) {}

  isAllowed(repository: string): boolean {
    return this.allowedRepositories.has(repository.toLowerCase());
  }

  async create(input: CreateTaskInput) {
    const existing = await this.tasks.findBySlackThread(
      input.workspaceId,
      input.channelId,
      input.threadTs,
    );
    if (existing) return { task: existing, created: false };

    const key = `${input.workspaceId}\0${input.channelId}\0${input.threadTs}`;
    const pending = this.inFlight.get(key);
    if (pending) return { task: await pending, created: false };

    const creation = this.createNew(input);
    this.inFlight.set(key, creation);
    try {
      return { task: await creation, created: true };
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async createNew(input: CreateTaskInput): Promise<Task> {
    const id = randomUUID();
    const issueNumber = await createAgentIssue(this.github, {
      owner: input.owner,
      repo: input.repo,
      task: input.task,
      metadata: {
        taskId: id,
        workspaceId: input.workspaceId,
        channelId: input.channelId,
        threadTs: input.threadTs,
        requesterUserId: input.requesterUserId,
        repository: `${input.owner}/${input.repo}`,
      },
    });
    const task = this.tasks.create({
      id,
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      threadTs: input.threadTs,
      requesterUserId: input.requesterUserId,
      repositoryOwner: input.owner,
      repositoryName: input.repo,
      githubIssueNumber: issueNumber,
      status: 'ready',
    });
    this.logger.info(
      {
        taskId: id,
        repository: `${input.owner}/${input.repo}`,
        issueNumber,
        slackChannel: input.channelId,
        slackThread: input.threadTs,
        status: 'ready',
      },
      'Created agent task',
    );
    return task;
  }
}
