import type { Request, Response, NextFunction } from 'express';
import type { Logger } from './logger.js';
import { env } from '../config/env.js';

export function createAuthMiddleware(logger: Logger) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
    const apiKey = req.get('x-api-key') ?? token;
    req.auth = {
      userId: apiKey ? 42 : 0,
      token: '',
      authenticated: Boolean(apiKey),
      email: apiKey && env.MCP_API_KEY && apiKey === env.MCP_API_KEY ? 'mcp-api-key@local' : undefined,
    };
    logger.info('MCP auth checked', {
      path: req.path,
      requestId: req.context?.requestId ?? req.id,
      traceId: req.context?.traceId,
      authenticated: Boolean(apiKey),
      authenticatedUser: req.auth.email,
    });
    next();
  };
}
