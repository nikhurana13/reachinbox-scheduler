import { connection } from '../queue/connection';
import { env } from '../config/env';

/**
 * One atomic Lua script covers both guards so concurrent workers cannot race:
 *  1. Spacing: next:{sender} = earliest time the next send is allowed.
 *  2. Hourly window: rate:{sender}:{YYYYMMDDHH}; overflow gets an order-preserving rank
 *     so spilled jobs land at nextHourStart + rank * gap instead of all at once.
 */
const LUA = `
local now, gap, limit, nextWin = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local nextAllowed = tonumber(redis.call('GET', KEYS[1]) or '0')
if now < nextAllowed then return {0, string.format('%.0f', nextAllowed), 'spacing'} end
local count = redis.call('INCR', KEYS[2])
if count == 1 then redis.call('EXPIRE', KEYS[2], 7200) end
if count > limit then
  redis.call('DECR', KEYS[2])
  local n = redis.call('INCR', KEYS[3])
  redis.call('EXPIRE', KEYS[3], 7200)
  return {0, string.format('%.0f', nextWin + (n - 1) * gap), 'hourly'}
end
redis.call('SET', KEYS[1], string.format('%.0f', now + gap), 'PX', math.max(gap * 2, 1000))
return {1, '0', 'ok'}
`;

connection.defineCommand('reserveSlot', { numberOfKeys: 3, lua: LUA });

export interface Slot {
  ok: boolean;
  retryAt: number;
  reason: 'ok' | 'spacing' | 'hourly';
  windowId: string;
  windowKey: string;
  limit: number;
}

export const windowId = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}`;

export const nextHourStart = (nowMs: number) => Math.floor(nowMs / 3_600_000) * 3_600_000 + 3_600_000;

export async function reserve(senderId: string, requestedLimit: number, nowMs = Date.now()): Promise<Slot> {
  const limit = Math.min(requestedLimit, env.MAX_EMAILS_PER_HOUR_PER_SENDER);
  const wid = windowId(new Date(nowMs));
  const windowKey = `rate:${senderId}:${wid}`;
  const res = (await (connection as any).reserveSlot(
    `next:${senderId}`,
    windowKey,
    `overflow:${senderId}:${wid}`,
    nowMs,
    env.MIN_DELAY_BETWEEN_EMAILS_MS,
    limit,
    nextHourStart(nowMs),
  )) as [number, string, Slot['reason']];

  let retryAt = Number(res[1]);
  // small jitter so jobs blocked on spacing don't all wake in the same millisecond
  if (res[2] === 'spacing') retryAt += Math.floor(Math.random() * Math.max(50, env.MIN_DELAY_BETWEEN_EMAILS_MS / 4));
  return { ok: res[0] === 1, retryAt, reason: res[2], windowId: wid, windowKey, limit };
}

/** Give the hourly count back when a reserved slot ends up unused (lost the claim race). */
export async function release(slot: Slot) {
  if (slot.ok) await connection.decr(slot.windowKey);
}
