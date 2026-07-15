import type { NextFunction, Request, Response } from 'express';
import { getEnv } from '../config/env.js';

export function requestTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestTimeoutMs = getEnv().REQUEST_TIMEOUT_MS;
  req.setTimeout(requestTimeoutMs);
  res.setTimeout(requestTimeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
}
