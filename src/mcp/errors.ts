import type { ErrorRequestHandler } from 'express';
import type { Logger } from './logger.js';
import { randomUUID } from 'node:crypto';

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const errorId = randomUUID();
    req.context = {
      ...(req.context ?? {
        requestId: typeof req.id === 'string' ? req.id : errorId,
        startTime: Date.now(),
        userId: req.auth?.userId ?? 0,
      }),
      errorId,
    };

    logger.error('MCP request error', {
      errorId,
      requestId: req.context.requestId,
      traceId: req.context.traceId,
      mcpTool: req.context.toolName,
      authenticatedUser: req.context.userEmail,
      error,
    });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error', errorId });
  };
}
