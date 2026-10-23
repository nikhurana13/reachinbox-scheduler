import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/prisma';
import { connection } from './queue/connection';
import { emailQueue } from './queue/emailQueue';
import { indexQueue, enqueueIndex } from './queue/indexQueue';
import { basicAuth } from './middleware/basicAuth';
import { errorHandler } from './middleware/errorHandler';
import { authRouter, meRouter } from './routes/auth';
import { emailsRouter } from './routes/emails';
import { slackRouter } from './routes/slack';
import { reconcile } from './services/reconcile';
import { ensureIndex, es } from './services/search';

const app = express();
app.set('trust proxy', 1);

// Bull Board first: it ships inline assets that the default helmet CSP would block
const boardAdapter = new ExpressAdapter();
boardAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue) as any, new BullMQAdapter(indexQueue) as any], serverAdapter: boardAdapter });
app.use('/admin/queues', basicAuth, boardAdapter.getRouter());

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/emails', emailsRouter);
app.use('/slack', slackRouter);

// Re-index every email (e.g. after Elasticsearch was wiped)
app.post('/admin/reindex', basicAuth, async (_req, res, next) => {
  try {
    const ids = await prisma.email.findMany({ select: { id: true } });
    await Promise.all(ids.map((e) => enqueueIndex(e.id)));
    res.json({ queued: ids.length });
  } catch (e) {
    next(e);
  }
});

app.get('/health', async (_req, res) => {
  const check = async (fn: () => Promise<unknown>) => fn().then(() => 'up', () => 'down');
  const status = {
    db: await check(() => prisma.$queryRaw`SELECT 1`),
    redis: await check(() => connection.ping()),
    elasticsearch: await check(() => es.ping()),
  };
  const ok = status.db === 'up' && status.redis === 'up';
  res.status(ok ? 200 : 503).json({ ok, ...status });
});

app.use(errorHandler);

async function main() {
  await ensureIndex().catch((err) => logger.warn({ err: err.message }, 'elasticsearch unavailable; search disabled until it is back'));
  await reconcile();
  app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT} (Bull Board at /admin/queues)`));
}
main().catch((err) => {
  logger.error({ err }, 'server failed to start');
  process.exit(1);
});
