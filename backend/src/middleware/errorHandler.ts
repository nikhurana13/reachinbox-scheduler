import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request', details: err.flatten().fieldErrors });
  }
  const status = err.status ?? 500;
  if (status >= 500) logger.error({ err }, 'unhandled error');
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
}
