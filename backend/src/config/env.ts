import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ELASTIC_URL: z.string().url(),
  SESSION_SECRET: z.string().min(8),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'must be 32 bytes as 64 hex chars'),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().int().min(0),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().int().min(1),
  MAX_SEND_ATTEMPTS: z.coerce.number().int().min(1),
  CLAIM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(120000),
  GLOBAL_LIMIT_PER_SEC: z.coerce.number().int().min(1).default(50),
  MAX_LEADS_PER_REQUEST: z.coerce.number().int().min(1).default(10000),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),
  DEV_LOGIN: z.enum(['true', 'false']).default('false'),

  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  SLACK_REDIRECT_URL: z.string().optional().default(''),

  BULL_BOARD_USER: z.string().min(1),
  BULL_BOARD_PASS: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
