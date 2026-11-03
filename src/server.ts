import { createApp } from './app';
import { env } from './config/env';
import { closeDatabase, connectDatabase } from './core/db';
import { ensureIndexes } from './core/indexes';
import { logger } from './core/logger';
import { articleStorage } from './modules/articles/article.storage';

async function main(): Promise<void> {
  await connectDatabase();
  await ensureIndexes();
  await articleStorage.ensureDirs();

  const server = createApp().listen(env.PORT, () => logger.info({ port: env.PORT }, 'api listening'));

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    // Stop accepting new connections, let in-flight requests finish, then close the database pool.
    server.close(() => {
      void closeDatabase().then(() => process.exit(0));
    });
    server.closeIdleConnections();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
