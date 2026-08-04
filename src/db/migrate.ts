import 'dotenv/config';
import { loadConfig } from '../config.js';
import { PostgresTaskRepository } from './postgres.js';

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL migration; no database was changed.');
  }
  const repository = await PostgresTaskRepository.connect(config.databaseUrl);
  await repository.close();
  console.log('PostgreSQL schema is ready (tasks and processed_events).');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'PostgreSQL migration failed');
  process.exitCode = 1;
});
