/**
 * Usage:
 *   npm run load-test                 # 1000 emails, same minute
 *   npm run load-test -- 10 3         # 10 emails, hourly limit 3 (hourly-limit scenario)
 * Needs: API + at least one worker running, and senders created.
 */
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/db/prisma';

const count = Number(process.argv[2] ?? 1000);
const hourlyLimit = Number(process.argv[3] ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER);
const delayMs = Number(process.env.LOAD_DELAY_MS ?? 0);

async function main() {
  const user = await prisma.user.upsert({
    where: { googleId: 'load-test' },
    update: {},
    create: { googleId: 'load-test', email: 'loadtest@example.com', name: 'Load Test' },
  });
  const token = jwt.sign({ sub: user.id }, env.SESSION_SECRET, { expiresIn: '1h' });
  const leads = Array.from({ length: count }, (_, i) => `lead${i}-${Date.now()}@example.com`);
  const startTime = new Date(Date.now() + 60_000).toISOString();

  const t0 = Date.now();
  const res = await fetch(`http://localhost:${env.PORT}/emails/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `session=${token}` },
    body: JSON.stringify({ subject: 'Load test', body: 'Hello from the load test', leads, startTime, delayMs, hourlyLimit }),
  });
  console.log(`POST /emails/schedule -> ${res.status} in ${Date.now() - t0} ms`, await res.json());

  for (let i = 0; i < 60; i++) {
    const rows = await prisma.email.groupBy({ by: ['status'], where: { userId: user.id }, _count: true });
    console.log(new Date().toISOString(), Object.fromEntries(rows.map((r) => [r.status, r._count])));
    await new Promise((r) => setTimeout(r, 10_000));
  }
  const early = await prisma.email.count({ where: { userId: user.id, status: 'SENT', sentAt: { lt: new Date(startTime) } } });
  console.log(`sent before start time: ${early} (expected 0)`);
  const dup = await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) - COUNT(DISTINCT "messageId") AS c FROM "Email" WHERE "userId" = ${user.id} AND "messageId" IS NOT NULL`;
  console.log(`duplicate messageIds: ${dup[0].c} (expected 0)`);
  await prisma.$disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
