import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { enqueueEmails } from '../queue/emailQueue';
import { enqueueIndex } from '../queue/indexQueue';
import { logger } from '../config/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(100_000),
  leads: z.array(z.string().trim().toLowerCase()).min(1).max(env.MAX_LEADS_PER_REQUEST),
  startTime: z.coerce.date(),
  delayMs: z.coerce.number().int().min(0).max(86_400_000),
  hourlyLimit: z.coerce.number().int().min(1).max(env.MAX_EMAILS_PER_HOUR_PER_SENDER),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export async function scheduleCampaign(userId: string, input: ScheduleInput) {
  const leads = [...new Set(input.leads)].filter((l) => EMAIL_RE.test(l));
  const skipped = input.leads.length - leads.length;
  if (leads.length === 0) throw Object.assign(new Error('No valid email addresses'), { status: 400 });

  const senders = await prisma.sender.findMany({ where: { active: true }, orderBy: { id: 'asc' } });
  if (senders.length === 0) {
    throw Object.assign(new Error('No senders configured. Run `npm run senders`.'), { status: 503 });
  }

  const now = Date.now();
  const start = Math.max(input.startTime.getTime(), now); // never in the past
  const campaignId = crypto.randomUUID();
  const rows = leads.map((toEmail, i) => ({
    id: crypto.randomUUID(),
    campaignId,
    userId,
    senderId: senders[i % senders.length].id, // round-robin
    toEmail,
    subject: input.subject,
    body: input.body,
    scheduledAt: new Date(start + i * input.delayMs),
  }));

  // One transaction: campaign + every email row
  await prisma.$transaction(
    async (tx) => {
      await tx.campaign.create({
        data: {
          id: campaignId, userId, subject: input.subject, body: input.body,
          startTime: new Date(start), delayMs: input.delayMs, hourlyLimit: input.hourlyLimit,
        },
      });
      await tx.email.createMany({ data: rows });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  // After commit: if this fails, reconcile() rebuilds the missing jobs from Postgres.
  try {
    await enqueueEmails(rows);
    await Promise.all(rows.map((r) => enqueueIndex(r.id)));
  } catch (err) {
    logger.error({ err, campaignId }, 'enqueue failed after commit; reconcile will recover');
  }

  return { campaignId, scheduled: rows.length, skipped, senders: senders.length };
}
