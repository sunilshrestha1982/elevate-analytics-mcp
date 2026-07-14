import type { Request, Response, NextFunction } from 'express';
import type { Logger } from './logger.js';

export function createContextMiddleware(logger: Logger) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const requestId = typeof req.id === 'string' ? req.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    req.context = {
      requestId,
      startTime: Date.now(),
      userId: req.auth?.userId ?? 0,
      userEmail: req.auth?.email,
    };
    logger.info('MCP context created', { requestId, path: req.path });
    next();
  };
}
