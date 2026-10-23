import { DelayedError, Worker } from 'bullmq';
import { connection } from '../queue/connection';
import { EMAIL_QUEUE } from '../queue/emailQueue';
import { enqueueIndex } from '../queue/indexQueue';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import * as rateLimiter from '../services/rateLimiter';
import { send } from '../services/mailer';
import { notifySlackOnce } from '../services/slack';

export function startEmailWorker() {
  const worker = new Worker(
    EMAIL_QUEUE,
    async (job, token) => {
      const email = await prisma.email.findUnique({
        where: { id: job.data.emailId },
        include: { sender: true, campaign: true },
      });
      // Layer 2 of idempotency: already done (or gone) means no-op
      if (!email || email.status === 'SENT' || email.status === 'FAILED') return;

      // 1) Per-sender spacing + hourly window (atomic in Redis)
      const slot = await rateLimiter.reserve(email.sender.id, email.campaign.hourlyLimit);
      if (!slot.ok) {
        if (slot.reason === 'hourly') await notifySlackOnce(email.userId, email.sender, slot);
        await job.moveToDelayed(slot.retryAt, token); // never drop, never fail
        throw new DelayedError();
      }

      // 2) Atomic claim (layer 3): only one worker can win; stale claims are recoverable
      const claimed = await prisma.email.updateMany({
        where: {
          id: email.id,
          OR: [
            { status: 'SCHEDULED' },
            { status: 'SENDING', claimedAt: { lt: new Date(Date.now() - env.CLAIM_TIMEOUT_MS) } },
          ],
        },
        data: { status: 'SENDING', claimedAt: new Date(), attempts: { increment: 1 } },
      });
      if (claimed.count === 0) {
        await rateLimiter.release(slot);
        return;
      }

      // 3) Send, then record immediately
      try {
        const { info, previewUrl } = await send(email);
        await prisma.email.update({
          where: { id: email.id },
          data: { status: 'SENT', sentAt: new Date(), messageId: info.messageId, previewUrl, error: null },
        });
      } catch (err) {
        const finalAttempt = job.attemptsMade + 1 >= env.MAX_SEND_ATTEMPTS;
        await prisma.email.update({
          where: { id: email.id },
          data: { status: finalAttempt ? 'FAILED' : 'SCHEDULED', error: String(err).slice(0, 1000) },
        });
        throw err; // BullMQ retries with backoff
      }
      await enqueueIndex(email.id);
    },
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
      lockDuration: 60_000,
      limiter: { max: env.GLOBAL_LIMIT_PER_SEC, duration: 1000 }, // queue-wide safety net
    },
  );

  worker.on('failed', (job, err) => logger.warn({ jobId: job?.id, err: err.message }, 'email job failed'));
  worker.on('error', (err) => logger.error({ err }, 'email worker error'));
  return worker;
}
