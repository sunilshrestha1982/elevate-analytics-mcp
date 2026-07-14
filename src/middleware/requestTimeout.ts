import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export function requestTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  req.setTimeout(env.REQUEST_TIMEOUT_MS);
  res.setTimeout(env.REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
}
