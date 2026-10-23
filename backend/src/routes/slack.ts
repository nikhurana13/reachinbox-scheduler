import crypto from 'crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { encrypt } from '../config/crypto';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';

export const slackRouter = Router();

const enabled = () => Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.SLACK_REDIRECT_URL);

// The callback arrives on the HTTPS tunnel domain, where the session cookie does not exist,
// so the state is a short-lived signed token bound to the user who started the flow.
slackRouter.get('/install', requireAuth, (req, res) => {
  if (!enabled()) return res.status(503).json({ error: 'Slack is not configured' });
  const state = jwt.sign({ sub: req.userId, n: crypto.randomBytes(8).toString('hex') }, env.SESSION_SECRET, { expiresIn: '10m' });
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.search = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: 'incoming-webhook',
    redirect_uri: env.SLACK_REDIRECT_URL,
    state,
  }).toString();
  res.redirect(url.toString());
});

slackRouter.get('/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as Record<string, string>;
    const back = (s: string) => res.redirect(`${env.FRONTEND_URL}/dashboard?slack=${s}`);
    if (!code || !state) return back('error');
    let userId: string;
    try {
      userId = (jwt.verify(state, env.SESSION_SECRET) as { sub: string }).sub;
    } catch {
      return res.status(400).send('Invalid or expired state');
    }
    const r = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: env.SLACK_CLIENT_ID, client_secret: env.SLACK_CLIENT_SECRET, redirect_uri: env.SLACK_REDIRECT_URL,
      }),
    });
    const data: any = await r.json();
    if (!data.ok || !data.incoming_webhook?.url) return back('error');
    const fields = { webhookUrl: encrypt(data.incoming_webhook.url), channel: data.incoming_webhook.channel ?? null, teamName: data.team?.name ?? null };
    await prisma.slackIntegration.upsert({ where: { userId }, update: fields, create: { userId, ...fields } });
    back('connected');
  } catch (e) {
    next(e);
  }
});

slackRouter.get('/status', requireAuth, async (req, res) => {
  const s = await prisma.slackIntegration.findUnique({ where: { userId: req.userId }, select: { channel: true, teamName: true } });
  res.json({ configured: enabled(), connected: Boolean(s), channel: s?.channel ?? null, teamName: s?.teamName ?? null });
});

slackRouter.delete('/disconnect', requireAuth, async (req, res) => {
  await prisma.slackIntegration.deleteMany({ where: { userId: req.userId } });
  res.json({ ok: true });
});
