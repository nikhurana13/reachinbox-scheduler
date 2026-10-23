import IORedis from 'ioredis';
import { env } from '../config/env';

// BullMQ requires maxRetriesPerRequest: null for blocking connections
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
