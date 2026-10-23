# ReachInbox Email Scheduler

Full-stack email job scheduler: schedule emails via API/UI, persist in Postgres, send at the right time with **BullMQ delayed jobs (no cron anywhere)**, per-sender rate limiting through Redis, restart-safe and idempotent, with Elasticsearch search, Bull Board, Slack alerts and Google login.

## Architecture

```
Next.js UI --> Express API --> Postgres (source of truth)
                  |                ^
                  |--> BullMQ queue (Redis, delayed jobs)
                  |         |
                  |         v
                  |     Worker(s) --> Redis (rate counters, spacing)
                  |         |------> Ethereal SMTP
                  |         |------> index queue --> Elasticsearch
                  |         '------> Slack (on limit hit)
                  '--> /admin/queues (Bull Board)
```

Postgres holds state; Redis/BullMQ is the timer. If Redis loses a job, `reconcile()` rebuilds it from Postgres.

## Quick start

```bash
docker compose up -d                      # Postgres, Redis (AOF), Elasticsearch
cd backend
cp .env.example .env                      # set ENCRYPTION_KEY (openssl rand -hex 32), SESSION_SECRET
npm install
npx prisma migrate dev --name init
npm run senders -- 3                      # create 3 Ethereal sender accounts
npm run dev                               # API on :4000
npm run dev:worker                        # worker (separate terminal; run several to scale)

cd ../frontend
cp .env.example .env.local
npm install && npm run dev                # UI on :3000
```

No Google credentials yet? Set `DEV_LOGIN=true` (API) and `NEXT_PUBLIC_DEV_LOGIN=true` (UI) for a local-only "Continue as dev user" button.

## Environment variables

| Variable | Purpose |
|---|---|
| `WORKER_CONCURRENCY` | Jobs processed in parallel per worker (default 5) |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum gap between sends per sender (default 2000) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Default and upper cap for the hourly limit (default 100) |
| `MAX_SEND_ATTEMPTS` | Retries with exponential backoff (default 3) |
| `CLAIM_TIMEOUT_MS` | Age after which a `SENDING` claim is treated as crashed |
| `GLOBAL_LIMIT_PER_SEC` | Queue-wide BullMQ limiter, a safety net |
| `MAX_LEADS_PER_REQUEST` | Cap per schedule call (default 10000) |
| `GOOGLE_*`, `SLACK_*` | OAuth apps (see below) |
| `BULL_BOARD_USER/PASS` | Basic auth for `/admin/queues` |

Everything is validated with Zod at startup; the process exits on bad config. No limit or delay is hardcoded.

## Ethereal

`npm run senders -- N` creates N accounts with `nodemailer.createTestAccount()` and stores them (password encrypted, AES-256-GCM). Sent rows show a preview URL in the UI.

## Google and Slack setup

- **Google:** create an OAuth client, add `http://localhost:4000/auth/google/callback`, put the id/secret in `.env`.
- **Slack:** create an app with the `incoming-webhook` scope. Slack needs HTTPS, so run `ngrok http 4000` (or cloudflared) and register `https://<tunnel>/slack/callback` as the redirect URL and in `SLACK_REDIRECT_URL`. The callback lands on the tunnel domain where the session cookie does not exist, so the OAuth `state` is a signed 10-minute token bound to the user who started the flow.

## How it works

- **Scheduling:** `POST /emails/schedule` validates and dedupes leads, then in one transaction creates the campaign and one `Email` row per lead (`scheduledAt = start + i * delay`, never in the past, senders round-robin). After commit, jobs are bulk-added with `jobId = email_<id>` and `delay = max(0, scheduledAt - now)`.
- **Persistence:** Redis runs with `appendonly yes` and `noeviction`. On API and worker boot `reconcile()` re-adds any `SCHEDULED` email with no job and resets stale `SENDING` rows.
- **Rate limiting:** one Lua script per reservation enforces per-sender spacing and a per-clock-hour counter atomically across workers. Overflow is rescheduled to `nextHourStart + rank * delay`, so nothing is dropped and order is roughly kept. Only the limited sender is delayed.
- **Idempotency (3 layers):** deterministic jobId; worker no-ops if status is `SENT`/`FAILED`; atomic `updateMany` claim.
- **Slack:** on an hourly-limit hit, one message per sender per hour. The integration is looked up at send time, so connecting later works without a redeploy and not being connected is a silent no-op.
- **Search:** indexing runs through its own queue, so a slow Elasticsearch never blocks sending. `POST /admin/reindex` rebuilds the index.

Chosen values: 2 s minimum delay, 100/hour per sender, concurrency 5.

## Behavior under load

1000+ emails at once: rows commit in one transaction, jobs are bulk-added with delays, nothing is sent early or in a burst. Throughput is capped by `senders x min(hourlyLimit, 3600000 / MIN_DELAY)`; workers scale horizontally because coordination lives in Redis and Postgres. Backlog beyond capacity just takes longer; Bull Board shows it live.

## API

`GET /auth/google`, `/auth/google/callback`, `POST /auth/logout`, `GET /me`, `POST /emails/schedule`, `GET /emails/scheduled?page=`, `GET /emails/sent?page=`, `GET /emails/search?q=&status=`, `GET /slack/install|callback|status`, `DELETE /slack/disconnect`, `GET /admin/queues`, `POST /admin/reindex`, `GET /health`.

## Testing

```bash
cd backend
npm test                   # rate limiter tests (needs local Redis)
npm run load-test          # 1000 emails; reports early sends and duplicate messageIds
npm run load-test -- 10 3  # hourly-limit scenario: limit 3, schedule 10
```

Manual scenarios from the plan: kill the worker mid-run and restart; restart the Redis container; run 3 worker processes against 100 emails; disconnect Slack and hit the limit.

## Assumptions and trade-offs

- BullMQ rejects `:` in custom job ids, so ids are `email_<uuid>` instead of `email:<uuid>`.
- Fixed clock-hour windows can burst at an hour boundary; a rolling window would be smoother but more complex.
- Delivery is **at-least-once with strong deduplication**. If a worker crashes after SMTP accepts a message but before the DB write, a retry could resend (mitigated by a deterministic Message-ID and short claim timeout). Exactly-once over SMTP is not achievable.
- The UI follows the plan's screens; it was not pixel-matched to the Figma, which was not available.

## Deployment Guide

### 1. Deploying Frontend to Vercel

The Next.js frontend is fully configured for deployment on **Vercel**:

1. Log into [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Import your GitHub repository (`reachinbox-scheduler`).
3. Under **Project Settings**:
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Framework Preset**: Next.js (automatically detected).
4. Under **Environment Variables**, add:
   - `BACKEND_URL`: `https://your-backend-api.com` *(URL of your deployed Express API)*
   - `NEXT_PUBLIC_DEV_LOGIN`: `false` *(or `true` if you want dev-login button enabled)*
5. Click **Deploy**.

> Next.js will automatically proxy all `/api/*` traffic to `BACKEND_URL` on the server-side, eliminating cross-origin browser restrictions.

### 2. Deploying Backend & Worker (Render / Railway / Fly.io / VPS)

The backend consists of:
- **Express API server** (`npm start` -> `node dist/server.js`)
- **BullMQ background worker** (`npm run start:worker` -> `node dist/worker.js`)

Because BullMQ requires a persistent event loop and background process to handle delayed queue jobs and rate limiting, the backend must be hosted as persistent services (e.g. on [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io)) rather than serverless functions.

**Required Cloud Services:**
- **Postgres:** Hosted on Supabase, Neon, or Render PostgreSQL.
- **Redis:** Hosted on Upstash, Redis Cloud, or Aiven (`appendonly yes`, `noeviction`).
- **Elasticsearch:** Hosted on Elastic Cloud or Bonsai.

**Backend Environment Variables:**
- Set `FRONTEND_URL` to your Vercel deployment URL (e.g. `https://reachinbox-scheduler.vercel.app`).
- Set `DATABASE_URL`, `REDIS_URL`, `ELASTICSEARCH_NODE`, `ENCRYPTION_KEY`, and `SESSION_SECRET`.
