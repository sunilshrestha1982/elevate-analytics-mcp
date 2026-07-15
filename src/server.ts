import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { healthRouter } from './routes/health.js';
import { userRouter } from './routes/users.js';
import { oauthRouter } from './routes/oauth.js';
import { getEnv, validateRequiredEnvOnStartup } from './config/env.js';
import { getPinoLogger, logger } from './lib/logger.js';
import { getMetricsRegistry, getNodeStatsSnapshot, observeRequestDuration } from './lib/metrics.js';
import { applySecurityMiddleware } from './middleware/security.js';
import { databaseService } from './services/databaseService.js';
import { systemHealthService } from './services/systemHealthService.js';
import { requestTimeoutMiddleware } from './middleware/requestTimeout.js';
import { inputSanitizationMiddleware } from './middleware/inputSanitization.js';
import { extractTraceContextFromHeaders, getTracer } from './lib/tracing.js';
import { context, trace } from '@opentelemetry/api';

dotenv.config();
const env = validateRequiredEnvOnStartup();
const host = '0.0.0.0';

const app = express();
const tracer = getTracer('http-server');

applySecurityMiddleware(app);
app.use(
  pinoHttp({
    logger: getPinoLogger(),
    genReqId: (req) => req.id ?? randomUUID(),
    customProps: (req: Request) => ({
      requestId: req.id,
      traceId: req.context?.traceId,
      authenticatedUserEmail: req.user?.email ?? req.auth?.email,
    }),
    customSuccessMessage: (req: IncomingMessage) => `request completed: ${req.method} ${req.url}`,
    customErrorMessage: (req: IncomingMessage) => `request failed: ${req.method} ${req.url}`,
  })
);
app.use(requestTimeoutMiddleware);
app.use(inputSanitizationMiddleware);

app.use((req, res, next) => {
  const parentContext = extractTraceContextFromHeaders(req.headers as unknown as Record<string, unknown>);
  const span = tracer.startSpan(`http ${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.route': req.path,
      'http.request_id': typeof req.id === 'string' ? req.id : '',
      ...(process.env.K_SERVICE ? { 'cloud.run.service.name': process.env.K_SERVICE } : {}),
      ...(process.env.K_REVISION ? { 'cloud.run.revision': process.env.K_REVISION } : {}),
    },
  }, parentContext);
  const traceId = span.spanContext().traceId;
  req.context = {
    requestId: typeof req.id === 'string' ? req.id : randomUUID(),
    startTime: Date.now(),
    userId: req.auth?.userId ?? req.user?.sub ?? 0,
    userEmail: req.user?.email ?? req.auth?.email,
    traceId,
  };
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    observeRequestDuration(req.method, req.route?.path ?? req.path, res.statusCode, durationMs);
    logger.info('HTTP request duration', {
      requestId: req.id,
      traceId,
      method: req.method,
      path: req.path,
      authenticatedUser: req.user?.email ?? req.auth?.email,
      statusCode: res.statusCode,
      executionTimeMs: Number(durationMs.toFixed(2)),
    });
    span.setAttribute('http.status_code', res.statusCode);
    span.setAttribute('http.response_time_ms', Number(durationMs.toFixed(2)));
    span.end();
  });
  const spanContext = trace.setSpan(parentContext, span);
  context.with(spanContext, next);
});

app.use(express.json());
app.use(cookieParser(env.SESSION_SECRET));
app.use('/health', healthRouter);
app.use('/users', userRouter);
app.use('/oauth', oauthRouter);

app.get('/ready', async (_req, res) => {
  const health = await systemHealthService.getHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/live', async (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/version', (_req, res) => {
  res.status(200).json({
    name: 'elevate-analytics-mcp',
    version: env.APP_VERSION,
    nodeEnv: env.NODE_ENV,
  });
});

app.get('/metrics', async (req, res) => {
  const metricsAuthToken = getEnv().METRICS_AUTH_TOKEN;
  if (metricsAuthToken) {
    const auth = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (auth !== metricsAuthToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const registry = getMetricsRegistry();
  res.setHeader('Content-Type', registry.contentType);
  return res.status(200).send(await registry.metrics());
});

app.get('/', (_req, res) => {
  res.json({ message: 'Elevate Analytics MCP server is running', stats: getNodeStatsSnapshot() });
});

app.use((error: unknown, req: Request, res: express.Response, _next: express.NextFunction) => {
  const errorId = randomUUID();
  logger.error('Unhandled HTTP error', {
    errorId,
    requestId: req.id,
    traceId: req.context?.traceId,
    authenticatedUser: req.user?.email ?? req.auth?.email,
    error,
  });
  res.status(500).json({ error: 'Internal Server Error', errorId });
});

const server = app.listen(env.PORT, host, () => {
  logger.info('Server listening', {
    host,
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    trustProxy: env.TRUST_PROXY,
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
  });
});

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Graceful shutdown started', { signal });
  server.close(async () => {
    await databaseService.disconnect();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Force exit after shutdown timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

export { app, server };
