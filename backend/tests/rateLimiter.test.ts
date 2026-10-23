// Requires a local Redis (docker compose up -d redis) and the env vars from .env.example
import { beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL ??= 'http://localhost:3000';
process.env.DATABASE_URL ??= 'postgresql://x';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.ELASTIC_URL ??= 'http://localhost:9200';
process.env.SESSION_SECRET ??= 'test-secret-123';
process.env.ENCRYPTION_KEY ??= '0'.repeat(64);
process.env.WORKER_CONCURRENCY = '5';
process.env.MIN_DELAY_BETWEEN_EMAILS_MS = '2000';
process.env.MAX_EMAILS_PER_HOUR_PER_SENDER = '100';
process.env.MAX_SEND_ATTEMPTS = '3';
process.env.BULL_BOARD_USER ??= 'a';
process.env.BULL_BOARD_PASS ??= 'b';

let rl: typeof import('../src/services/rateLimiter');
beforeAll(async () => { rl = await import('../src/services/rateLimiter'); });

describe('rate limiter', () => {
  it('enforces spacing between sends for one sender', async () => {
    const s = crypto.randomUUID();
    const t = Date.now();
    expect((await rl.reserve(s, 100, t)).ok).toBe(true);
    const second = await rl.reserve(s, 100, t + 500);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('spacing');
    expect((await rl.reserve(s, 100, t + 2500)).ok).toBe(true);
  });

  it('delays overflow into the next hour, in order', async () => {
    const s = crypto.randomUUID();
    let t = Date.now();
    for (let i = 0; i < 3; i++) { expect((await rl.reserve(s, 3, t)).ok).toBe(true); t += 2500; }
    const a = await rl.reserve(s, 3, t);
    const b = await rl.reserve(s, 3, t + 2500);
    expect(a.ok).toBe(false);
    expect(a.reason).toBe('hourly');
    expect(b.retryAt).toBeGreaterThan(a.retryAt);
    expect(a.retryAt).toBeGreaterThanOrEqual(rl.nextHourStart(t));
  });

  it('does not let one sender affect another', async () => {
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    const t = Date.now();
    await rl.reserve(a, 1, t);
    expect((await rl.reserve(b, 1, t)).ok).toBe(true);
  });
});
