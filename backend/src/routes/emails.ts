import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { scheduleCampaign, scheduleSchema } from '../services/scheduler';
import { searchEmails } from '../services/search';
import type { EmailStatus } from '@prisma/client';

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

const scheduleLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

emailsRouter.post('/schedule', scheduleLimiter, async (req, res, next) => {
  try {
    const input = scheduleSchema.parse(req.body);
    res.status(201).json(await scheduleCampaign(req.userId!, input));
  } catch (e) {
    next(e);
  }
});

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function listHandler(statuses: EmailStatus[], order: 'asc' | 'desc', field: 'scheduledAt' | 'sentAt') {
  return async (req: any, res: any, next: any) => {
    try {
      const { page, pageSize } = pageSchema.parse(req.query);
      const where = { userId: req.userId!, status: { in: statuses } }; // always scoped by user
      const [total, items] = await Promise.all([
        prisma.email.count({ where }),
        prisma.email.findMany({
          where,
          orderBy: [{ [field]: order }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true, toEmail: true, subject: true, status: true, scheduledAt: true,
            sentAt: true, previewUrl: true, error: true, attempts: true,
          },
        }),
      ]);
      res.json({ items, page, pageSize, total });
    } catch (e) {
      next(e);
    }
  };
}

emailsRouter.get('/scheduled', listHandler(['SCHEDULED', 'SENDING'], 'asc', 'scheduledAt'));
emailsRouter.get('/sent', listHandler(['SENT', 'FAILED'], 'desc', 'sentAt'));

emailsRouter.get('/search', async (req, res, next) => {
  try {
    const { q, status } = z
      .object({ q: z.string().trim().max(200).default(''), status: z.enum(['SCHEDULED', 'SENDING', 'SENT', 'FAILED']).optional() })
      .parse(req.query);
    res.json({ items: await searchEmails(req.userId!, q, status) });
  } catch (e) {
    next(e);
  }
});
