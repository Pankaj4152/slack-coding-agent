import 'dotenv/config';
import { loadConfig } from '../config.js';
import { PostgresTaskRepository } from './postgres.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const migrationUrl = config.databaseUrlUnpooled ?? config.databaseUrl;
  if (!migrationUrl) {
    throw new Error(
      'DATABASE_URL_UNPOOLED or DATABASE_URL is required for PostgreSQL migration; no database was changed.',
    );
  }
  const repository = await PostgresTaskRepository.connect(migrationUrl);
  await repository.close();
  console.log('PostgreSQL schema is ready (tasks and processed_events).');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'PostgreSQL migration failed');
  process.exitCode = 1;
});
