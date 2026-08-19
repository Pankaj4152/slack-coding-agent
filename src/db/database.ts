import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { migrationSql } from './migrations.js';

export type SqliteDatabase = Database.Database;

export function openDatabase(path: string): SqliteDatabase {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrationSql);
  migrateCancelledStatus(db);
  return db;
}

function migrateCancelledStatus(db: SqliteDatabase): void {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
    .get() as { sql?: string } | undefined;
  if (row?.sql?.includes("'cancelled'")) return;
  db.transaction(() => {
    db.exec(`
      ALTER TABLE tasks RENAME TO tasks_legacy_status;
      ${migrationSql.split('CREATE TABLE IF NOT EXISTS processed_events')[0]}
      INSERT INTO tasks SELECT * FROM tasks_legacy_status;
      DROP TABLE tasks_legacy_status;
    `);
  })();
}
