import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Express } from 'express';
import { getEnv } from '../config/env.js';

const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function parseAllowedOrigins(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item !== '*');
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[], nodeEnv: string) {
  if (!origin) return true;

  if (nodeEnv === 'development' && localhostPattern.test(origin)) {
    return true;
  }

  if (localhostPattern.test(origin)) {
    return false;
  }

  if (allowedOrigins.includes(origin)) return true;

  return false;
}

export function applySecurityMiddleware(app: Express) {
  const env = getEnv();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin, allowedOrigins, env.NODE_ENV)) {
          return callback(null, true);
        }

        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(compression());

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: env.RATE_LIMIT_PER_MINUTE,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests' },
    })
  );
}
