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

export class RepositoryPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryPreflightError';
  }
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
    await this.preflightRepository(input.owner, input.repo);
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

  private async preflightRepository(owner: string, repo: string): Promise<void> {
    try {
      const repository = await this.github.rest.repos.get({ owner, repo });
      if (repository.data.archived || repository.data.disabled) {
        throw new RepositoryPreflightError(
          `Repository \`${owner}/${repo}\` is archived or disabled, so a coding task cannot run there.`,
        );
      }
      if (!repository.data.has_issues) {
        throw new RepositoryPreflightError(
          `GitHub Issues are disabled in \`${owner}/${repo}\`. Enable Issues and try again.`,
        );
      }
      await this.github.rest.repos.getContent({
        owner,
        repo,
        path: '.github/workflows/coding-agent.yml',
        ref: repository.data.default_branch,
      });
    } catch (error) {
      if (error instanceof RepositoryPreflightError) throw error;
      const status = (error as { status?: number }).status;
      if (status === 404) {
        throw new RepositoryPreflightError(
          `I cannot access \`${owner}/${repo}\`, or its \`.github/workflows/coding-agent.yml\` file is missing from the default branch. Install the GitHub App and add the workflow, then try again.`,
        );
      }
      throw error;
    }
  }
}
