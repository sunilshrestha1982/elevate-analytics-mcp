import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const PUBLIC_PATHS = new Set(['/health', '/ready', '/live', '/version']);

const getApiKey = (req: Request) => req.get('x-api-key') ?? req.get('authorization')?.replace(/^Bearer\s+/i, '');

const secureEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const createMcpApiKeyAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (PUBLIC_PATHS.has(req.path)) {
      return next();
    }

    const expectedKey = env.MCP_API_KEY;
    const providedKey = getApiKey(req);

    if (!expectedKey || !providedKey || !secureEquals(providedKey, expectedKey)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
  };
};
