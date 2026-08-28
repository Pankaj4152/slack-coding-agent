export const migrationSql = `
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
