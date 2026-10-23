import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { emailQueue, emailJobId, toJob } from '../queue/emailQueue';
import { logger } from '../config/logger';

/**
 * Postgres is the source of truth; Redis is the timer. On boot, make sure every
 * pending email has a job, and release claims left behind by a crashed worker.
 */
export async function reconcile() {
  const staleBefore = new Date(Date.now() - env.CLAIM_TIMEOUT_MS);
  const reset = await prisma.email.updateMany({
    where: { status: 'SENDING', claimedAt: { lt: staleBefore } },
    data: { status: 'SCHEDULED' },
  });

  let requeued = 0;
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.email.findMany({
      where: { status: 'SCHEDULED' },
      select: { id: true, scheduledAt: true },
      orderBy: { id: 'asc' },
      take: 500,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    const jobs = await Promise.all(batch.map((e) => emailQueue.getJob(emailJobId(e.id))));
    const missing = batch.filter((_, i) => !jobs[i]);
    if (missing.length) {
      await emailQueue.addBulk(missing.map(toJob));
      requeued += missing.length;
    }
  }
  logger.info({ staleReset: reset.count, requeued }, 'reconcile complete');
  return { staleReset: reset.count, requeued };
}
