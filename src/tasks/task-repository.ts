import type { SqliteDatabase } from '../db/database.js';
import type { Task, TaskStatus } from './task-types.js';

type TaskRow = {
  id: string;
  workspace_id: string;
  channel_id: string;
  thread_ts: string;
  requester_user_id: string;
  repository_owner: string;
  repository_name: string;
  github_issue_number: number;
  status: TaskStatus;
  last_agent_question_comment_id: number | null;
  created_at: string;
  updated_at: string;
};

export class TaskRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(input: Omit<Task, 'createdAt' | 'updatedAt' | 'lastAgentQuestionCommentId'>): Task {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO tasks (
          id, workspace_id, channel_id, thread_ts, requester_user_id,
          repository_owner, repository_name, github_issue_number, status,
          last_agent_question_comment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        input.id,
        input.workspaceId,
        input.channelId,
        input.threadTs,
        input.requesterUserId,
        input.repositoryOwner,
        input.repositoryName,
        input.githubIssueNumber,
        input.status,
        now,
        now,
      );
    return this.findById(input.id)!;
  }

  findById(id: string): Task | undefined {
    return mapRow(
      this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined,
    );
  }

  findBySlackThread(workspaceId: string, channelId: string, threadTs: string): Task | undefined {
    return mapRow(
      this.db
        .prepare('SELECT * FROM tasks WHERE workspace_id = ? AND channel_id = ? AND thread_ts = ?')
        .get(workspaceId, channelId, threadTs) as TaskRow | undefined,
    );
  }

  findByGithubIssue(owner: string, repo: string, issueNumber: number): Task | undefined {
    return mapRow(
      this.db
        .prepare(
          `SELECT * FROM tasks
           WHERE lower(repository_owner) = lower(?) AND lower(repository_name) = lower(?)
             AND github_issue_number = ?`,
        )
        .get(owner, repo, issueNumber) as TaskRow | undefined,
    );
  }

  updateStatus(id: string, status: TaskStatus, questionCommentId?: number): Task {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE tasks SET status = ?, updated_at = ?,
         last_agent_question_comment_id = COALESCE(?, last_agent_question_comment_id)
         WHERE id = ?`,
      )
      .run(status, now, questionCommentId ?? null, id);
    const task = this.findById(id);
    if (!task) throw new Error(`Task ${id} not found`);
    return task;
  }

  transitionStatus(id: string, from: TaskStatus, to: TaskStatus): boolean {
    const result = this.db
      .prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
      .run(to, new Date().toISOString(), id, from);
    return result.changes === 1;
  }

  claimEvent(eventId: string, source: 'slack' | 'github'): boolean {
    const result = this.db
      .prepare(
        'INSERT OR IGNORE INTO processed_events (event_id, source, processed_at) VALUES (?, ?, ?)',
      )
      .run(eventId, source, new Date().toISOString());
    return result.changes === 1;
  }
}

function mapRow(row: TaskRow | undefined): Task | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    channelId: row.channel_id,
    threadTs: row.thread_ts,
    requesterUserId: row.requester_user_id,
    repositoryOwner: row.repository_owner,
    repositoryName: row.repository_name,
    githubIssueNumber: row.github_issue_number,
    status: row.status,
    lastAgentQuestionCommentId: row.last_agent_question_comment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
