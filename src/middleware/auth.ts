import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: number;
    email: string;
    googleUserId?: string;
  };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const secret = getEnv().JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const verified = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'elevate-analytics-mcp',
      audience: 'elevate-analytics-mcp',
    }) as unknown as {
      sub: number;
      email: string;
      googleUserId?: string;
    };

    if (!Number.isInteger(verified.sub) || verified.sub <= 0 || typeof verified.email !== 'string' || verified.email.length < 3) {
      throw new Error('JWT payload is malformed');
    }

    req.user = verified;
    req.auth = {
      userId: verified.sub,
      token: '',
      authenticated: true,
      email: verified.email,
    };
    return next();
  } catch (error) {
    logger.error('JWT verification failed', error);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

export const requireSameSiteOrigin = (req: Request, res: Response, next: NextFunction) => {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method.toUpperCase())) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');

  if (!origin && !referer) {
    const nodeEnv = getEnv().NODE_ENV;
    if (nodeEnv === 'production' || nodeEnv === 'staging') {
      return res.status(403).json({ error: 'Missing origin metadata' });
    }
    return next();
  }

  const candidate = origin ?? referer;
  if (!candidate) {
    return next();
  }

  try {
    const expectedOrigin = `${req.protocol}://${req.get('host')}`;
    const parsed = new URL(candidate);
    if (parsed.origin !== expectedOrigin) {
      return res.status(403).json({ error: 'Forbidden origin' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid origin' });
  }

  return next();
};

export const requireGoogleAccount = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.googleUserId) {
    return res.status(403).json({ error: 'Google account required' });
  }

  return next();
};
