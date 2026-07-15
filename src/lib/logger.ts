import pino, { type Logger as PinoLogger } from 'pino';
import { getActiveTraceContext } from './tracing.js';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'elevate-analytics-mcp',
    env: process.env.NODE_ENV ?? 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.remoteAddress',
      'res.headers["set-cookie"]',
      'meta.accessToken',
      'meta.refreshToken',
      'meta.token',
      'meta.codeVerifier',
      'meta.authorization',
      'meta.apiKey',
      'meta.client_secret',
      'meta.jwt',
      '*.authorization',
      '*.cookie',
      '*.set-cookie',
    ],
    censor: '[Redacted]',
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});

function normalizeMeta(meta: unknown) {
  if (meta instanceof Error) {
    return { err: pino.stdSerializers.err(meta) };
  }
  return meta;
}

function wrapLogger(base: PinoLogger) {
  return {
    info: (message: string, meta?: unknown) => {
      const traceContext = getActiveTraceContext();
      if (meta !== undefined) {
        base.info({ ...traceContext, meta: normalizeMeta(meta) }, message);
        return;
      }
      base.info(traceContext, message);
    },
    warn: (message: string, meta?: unknown) => {
      const traceContext = getActiveTraceContext();
      if (meta !== undefined) {
        base.warn({ ...traceContext, meta: normalizeMeta(meta) }, message);
        return;
      }
      base.warn(traceContext, message);
    },
    error: (message: string, meta?: unknown) => {
      const traceContext = getActiveTraceContext();
      if (meta !== undefined) {
        base.error({ ...traceContext, meta: normalizeMeta(meta) }, message);
        return;
      }
      base.error(traceContext, message);
    },
    child: (bindings: Record<string, unknown>) => wrapLogger(base.child(bindings)),
    raw: base,
  };
}

export const logger = wrapLogger(pinoLogger);

export const createChildLogger = (bindings: Record<string, unknown>) => logger.child(bindings);

export const getPinoLogger = () => pinoLogger;
