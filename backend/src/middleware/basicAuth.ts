import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const safeEq = (a: string, b: string) => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, ...rest] = Buffer.from(encoded, 'base64').toString().split(':');
    if (safeEq(user, env.BULL_BOARD_USER) && safeEq(rest.join(':'), env.BULL_BOARD_PASS)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="admin"').status(401).send('Authentication required');
}
