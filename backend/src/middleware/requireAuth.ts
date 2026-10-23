import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const SESSION_COOKIE = 'session';

export const signSession = (userId: string) => jwt.sign({ sub: userId }, env.SESSION_SECRET, { expiresIn: '7d' });

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: 'Not signed in' });
    const payload = jwt.verify(token, env.SESSION_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}
