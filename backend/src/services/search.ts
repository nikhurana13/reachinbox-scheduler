import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';
import { prisma } from '../db/prisma';

export const es = new Client({ node: env.ELASTIC_URL });
export const INDEX = 'emails';

export async function ensureIndex() {
  const exists = await es.indices.exists({ index: INDEX });
  if (exists) return;
  await es.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        toEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        subject: { type: 'text' },
        body: { type: 'text' },
        status: { type: 'keyword' },
        scheduledAt: { type: 'date' },
        sentAt: { type: 'date' },
        userId: { type: 'keyword' },
        senderId: { type: 'keyword' },
      },
    },
  });
}

export async function indexEmail(emailId: string) {
  const e = await prisma.email.findUnique({ where: { id: emailId } });
  if (!e) return;
  await es.index({
    index: INDEX,
    id: e.id,
    document: {
      toEmail: e.toEmail, subject: e.subject, body: e.body, status: e.status,
      scheduledAt: e.scheduledAt, sentAt: e.sentAt, userId: e.userId, senderId: e.senderId,
    },
  });
}

export async function searchEmails(userId: string, q: string, status?: string, size = 50) {
  const filter: object[] = [{ term: { userId } }];
  if (status) filter.push({ term: { status } });
  const r = await es.search({
    index: INDEX,
    size,
    query: {
      bool: {
        filter,
        must: q
          ? [{ multi_match: { query: q, fields: ['subject^2', 'body', 'toEmail'], fuzziness: 'AUTO' } }]
          : [{ match_all: {} }],
      },
    },
    sort: [{ scheduledAt: 'desc' }],
  });
  return r.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) }));
}
