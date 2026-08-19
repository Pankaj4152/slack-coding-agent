import { Pool, type PoolConfig } from 'pg';
import type { TaskStore } from '../tasks/task-repository.js';
import type { Task, TaskStatus } from '../tasks/task-types.js';

const migrationSql = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  requester_user_id TEXT NOT NULL,
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  github_issue_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN (
    'creating', 'ready', 'working', 'needs_input', 'pr_created', 'failed', 'cancelled', 'completed'
  )),
  last_agent_question_comment_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id, channel_id, thread_ts),
  UNIQUE(repository_owner, repository_name, github_issue_number)
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  processed_at TEXT NOT NULL
);
`;

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

export class PostgresTaskRepository implements TaskStore {
  private constructor(private readonly pool: Pool) {}

  static async connect(connectionString: string): Promise<PostgresTaskRepository> {
    if (!/[?&]sslmode=(require|verify-ca|verify-full)(?:&|$)/i.test(connectionString)) {
      throw new Error('DATABASE_URL must include sslmode=require (or verify-ca/verify-full)');
    }
    const connectionUrl = new URL(connectionString);
    const sslMode = connectionUrl.searchParams.get('sslmode')?.toLowerCase();
    connectionUrl.searchParams.delete('sslmode');
    const config: PoolConfig = {
      connectionString: connectionUrl.toString(),
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // `require` encrypts the connection but permits managed providers that
      // present a private/self-signed CA. Use verify-full when a trusted CA is
      // available and certificate validation is required.
      ssl: { rejectUnauthorized: sslMode === 'verify-full' },
    };
    const repository = new PostgresTaskRepository(new Pool(config));
    await repository.pool.query(migrationSql);
    await repository.pool.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
      ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK(status IN (
        'creating', 'ready', 'working', 'needs_input', 'pr_created', 'failed', 'cancelled', 'completed'
      ));
    `);
    return repository;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async checkHealth(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async create(
    input: Omit<Task, 'createdAt' | 'updatedAt' | 'lastAgentQuestionCommentId'>,
  ): Promise<Task> {
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO tasks (
        id, workspace_id, channel_id, thread_ts, requester_user_id,
        repository_owner, repository_name, github_issue_number, status,
        last_agent_question_comment_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11)`,
      [
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
      ],
    );
    const task = await this.findById(input.id);
    if (!task) throw new Error(`Task ${input.id} was not created`);
    return task;
  }

  async findById(id: string): Promise<Task | undefined> {
    const result = await this.pool.query<TaskRow>('SELECT * FROM tasks WHERE id = $1', [id]);
    return mapRow(result.rows[0]);
  }

  async findBySlackThread(
    workspaceId: string,
    channelId: string,
    threadTs: string,
  ): Promise<Task | undefined> {
    const result = await this.pool.query<TaskRow>(
      'SELECT * FROM tasks WHERE workspace_id = $1 AND channel_id = $2 AND thread_ts = $3',
      [workspaceId, channelId, threadTs],
    );
    return mapRow(result.rows[0]);
  }

  async findByGithubIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<Task | undefined> {
    const result = await this.pool.query<TaskRow>(
      `SELECT * FROM tasks
       WHERE lower(repository_owner) = lower($1) AND lower(repository_name) = lower($2)
         AND github_issue_number = $3`,
      [owner, repo, issueNumber],
    );
    return mapRow(result.rows[0]);
  }

  async updateStatus(id: string, status: TaskStatus, questionCommentId?: number): Promise<Task> {
    const result = await this.pool.query<TaskRow>(
      `UPDATE tasks SET status = $1, updated_at = $2,
       last_agent_question_comment_id = COALESCE($3, last_agent_question_comment_id)
       WHERE id = $4 RETURNING *`,
      [status, new Date().toISOString(), questionCommentId ?? null, id],
    );
    const task = mapRow(result.rows[0]);
    if (!task) throw new Error(`Task ${id} not found`);
    return task;
  }

  async transitionStatus(id: string, from: TaskStatus, to: TaskStatus): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE tasks SET status = $1, updated_at = $2 WHERE id = $3 AND status = $4',
      [to, new Date().toISOString(), id, from],
    );
    return result.rowCount === 1;
  }

  async claimEvent(eventId: string, source: 'slack' | 'github'): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO processed_events (event_id, source, processed_at)
       VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId, source, new Date().toISOString()],
    );
    return result.rowCount === 1;
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
