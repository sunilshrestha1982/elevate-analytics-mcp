import type { ErrorRequestHandler } from 'express';
import type { Logger } from './logger.js';

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    logger.error('MCP request error', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  };
}
