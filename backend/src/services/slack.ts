import { prisma } from '../db/prisma';
import { connection } from '../queue/connection';
import { decrypt } from '../config/crypto';
import { logger } from '../config/logger';
import type { Slot } from './rateLimiter';

/**
 * Posts once per sender per hour window. The integration is looked up at send time,
 * so connecting Slack later works with no redeploy, and no integration means a silent no-op.
 */
export async function notifySlackOnce(userId: string, sender: { id: string; email: string }, slot: Slot) {
  try {
    const integration = await prisma.slackIntegration.findUnique({ where: { userId } });
    if (!integration) return;
    const first = await connection.set(`slack:${sender.id}:${slot.windowId}`, '1', 'EX', 3600, 'NX');
    if (!first) return;
    const resumes = new Date(slot.retryAt).toISOString();
    const res = await fetch(decrypt(integration.webhookUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:warning: Sender *${sender.email}* hit its hourly limit (${slot.limit}/hour). Remaining emails are delayed and resume at ${resumes}.`,
      }),
    });
    if (!res.ok) logger.warn({ status: res.status }, 'slack webhook rejected message');
  } catch (err) {
    logger.error({ err }, 'slack notification failed (ignored)');
  }
}
