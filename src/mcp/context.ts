import type { Request, Response, NextFunction } from 'express';
import type { Logger } from './logger.js';

export function createContextMiddleware(logger: Logger) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const requestId = typeof req.id === 'string' ? req.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    req.context = {
      ...(req.context ?? {}),
      requestId,
      startTime: req.context?.startTime ?? Date.now(),
      userId: req.auth?.userId ?? req.context?.userId ?? 0,
      userEmail: req.auth?.email ?? req.context?.userEmail,
      traceId: req.context?.traceId,
    };
    logger.info('MCP context created', {
      requestId,
      traceId: req.context.traceId,
      path: req.path,
      authenticatedUser: req.context.userEmail,
    });
    next();
  };
}
