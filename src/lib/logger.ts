import pino, { type Logger as PinoLogger } from 'pino';

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
      'meta.client_secret',
      'meta.jwt',
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
      if (meta !== undefined) {
        base.info({ meta: normalizeMeta(meta) }, message);
        return;
      }
      base.info(message);
    },
    warn: (message: string, meta?: unknown) => {
      if (meta !== undefined) {
        base.warn({ meta: normalizeMeta(meta) }, message);
        return;
      }
      base.warn(message);
    },
    error: (message: string, meta?: unknown) => {
      if (meta !== undefined) {
        base.error({ meta: normalizeMeta(meta) }, message);
        return;
      }
      base.error(message);
    },
    child: (bindings: Record<string, unknown>) => wrapLogger(base.child(bindings)),
    raw: base,
  };
}

export const logger = wrapLogger(pinoLogger);

export const createChildLogger = (bindings: Record<string, unknown>) => logger.child(bindings);

export const getPinoLogger = () => pinoLogger;
