import { env } from './config/env';
import { logger } from './config/logger';
import { reconcile } from './services/reconcile';
import { ensureIndex } from './services/search';
import { startEmailWorker } from './workers/emailWorker';
import { startIndexWorker } from './workers/indexWorker';
import { prisma } from './db/prisma';
import { connection } from './queue/connection';

async function main() {
  await ensureIndex().catch((err) => logger.warn({ err: err.message }, 'elasticsearch unavailable; indexing will retry'));
  await reconcile();
  const email = startEmailWorker();
  const index = startIndexWorker();
  logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'workers started');

  const shutdown = async () => {
    logger.info('shutting down workers');
    await Promise.all([email.close(), index.close()]);
    await prisma.$disconnect();
    connection.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
