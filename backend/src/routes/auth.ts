import crypto from 'crypto';
import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env, isProd } from '../config/env';
import { prisma } from '../db/prisma';
import { requireAuth, signSession, SESSION_COOKIE } from '../middleware/requireAuth';

const cookieBase = { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/' };
const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      { clientID: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, callbackURL: env.GOOGLE_CALLBACK_URL },
      async (_at, _rt, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Google account has no email'));
          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: { name: profile.displayName, avatarUrl: profile.photos?.[0]?.value, email },
            create: { googleId: profile.id, email, name: profile.displayName, avatarUrl: profile.photos?.[0]?.value },
          });
          done(null, user);
        } catch (e) {
          done(e as Error);
        }
      },
    ),
  );
}

export const authRouter = Router();

authRouter.get('/google', (req, res, next) => {
  if (!googleEnabled) return res.status(503).json({ error: 'Google login is not configured' });
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { ...cookieBase, maxAge: 10 * 60_000 });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next);
});

authRouter.get('/google/callback', (req, res, next) => {
  if (!googleEnabled) return res.status(503).end();
  if (!req.query.state || req.query.state !== req.cookies?.oauth_state) {
    return res.status(400).send('Invalid OAuth state');
  }
  res.clearCookie('oauth_state', cookieBase);
  passport.authenticate('google', { session: false }, (err: unknown, user: { id: string } | false) => {
    if (err || !user) return res.redirect(`${env.FRONTEND_URL}/login?error=google`);
    res.cookie(SESSION_COOKIE, signSession(user.id), { ...cookieBase, maxAge: 7 * 86_400_000 });
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  })(req, res, next);
});

// Local-only shortcut so the app can be exercised without Google credentials
if (env.DEV_LOGIN === 'true' && !isProd) {
  authRouter.get('/dev-login', async (_req, res) => {
    const user = await prisma.user.upsert({
      where: { googleId: 'dev-user' },
      update: {},
      create: { googleId: 'dev-user', email: 'dev@example.com', name: 'Dev User' },
    });
    res.cookie(SESSION_COOKIE, signSession(user.id), { ...cookieBase, maxAge: 7 * 86_400_000 });
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  });
}

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieBase);
  res.json({ ok: true });
});

export const meRouter = Router();
meRouter.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (!user) return res.status(401).json({ error: 'Unknown user' });
  res.json(user);
});
