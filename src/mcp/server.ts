import express from 'express';
import { createServer } from 'node:http';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRouter } from './router.js';
import { createToolRegistry } from './toolRegistry.js';
import { createResourceRegistry } from './resourceRegistry.js';
import { createPromptRegistry } from './promptRegistry.js';
import { createAuthMiddleware } from './auth.js';
import { createContextMiddleware } from './context.js';
import { createErrorHandler } from './errors.js';
import { createLogger } from './logger.js';
import { applySecurityMiddleware } from '../middleware/security.js';
import { getMetricsRegistry, observeRequestDuration } from '../lib/metrics.js';
import { env } from '../config/env.js';
import { getPinoLogger } from '../lib/logger.js';
import { getTracer } from '../lib/tracing.js';

export function createMcpApp(options: { name?: string; version?: string } = {}) {
  const app = express();
  const logger = createLogger('mcp');
  const tracer = getTracer('mcp-server');
  const server = new McpServer({ name: options.name ?? 'elevate-analytics-mcp', version: options.version ?? '0.1.0' });

  const toolRegistry = createToolRegistry(server, logger);
  const resourceRegistry = createResourceRegistry(server, logger);
  const promptRegistry = createPromptRegistry(server, logger);
  const authMiddleware = createAuthMiddleware(logger);
  const contextMiddleware = createContextMiddleware(logger);

  toolRegistry.registerAll();
  resourceRegistry.registerAll();
  promptRegistry.registerAll();

  applySecurityMiddleware(app);
  app.use(
    pinoHttp({
      logger: getPinoLogger(),
      genReqId: (req) => req.id ?? randomUUID(),
      customProps: (req) => ({
        requestId: req.id,
        authenticatedUserEmail: req.auth?.email,
      }),
      customSuccessMessage: (req: IncomingMessage) => `mcp request completed: ${req.method} ${req.url}`,
    })
  );
  app.use((req, res, next) => {
    const span = tracer.startSpan(`mcp ${req.method} ${req.path}`, {
      attributes: {
        'http.method': req.method,
        'http.route': req.path,
        'http.request_id': req.id ?? '',
      },
    });
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      observeRequestDuration(req.method, req.route?.path ?? req.path, res.statusCode, durationMs);
      span.setAttribute('http.status_code', res.statusCode);
      span.setAttribute('http.response_time_ms', Number(durationMs.toFixed(2)));
      span.end();
    });
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    const isPublic = req.path === '/health' || req.path === '/ready' || req.path === '/live';
    if (isPublic) return next();

    // Fail closed when MCP_API_KEY is not configured for protected endpoints.
    if (!env.MCP_API_KEY) {
      return res.status(500).json({ error: 'MCP_API_KEY is not configured' });
    }

    const apiKey = req.get('x-api-key') ?? req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (apiKey !== env.MCP_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
  });
  app.use(authMiddleware);
  app.use(contextMiddleware);
  app.use('/mcp', createRouter({ server, toolRegistry, resourceRegistry, promptRegistry, logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/live', (_req, res) => res.json({ status: 'alive' }));
  app.get('/version', (_req, res) => res.json({ name: options.name ?? 'elevate-analytics-mcp', version: options.version ?? '0.1.0' }));
  app.get('/ready', (_req, res) => res.json({ ready: true }));
  app.get('/metrics', async (req, res) => {
    if (env.METRICS_AUTH_TOKEN) {
      const auth = req.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (auth !== env.METRICS_AUTH_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    const registry = getMetricsRegistry();
    res.setHeader('Content-Type', registry.contentType);
    return res.status(200).send(await registry.metrics());
  });

  app.use(createErrorHandler(logger));
  return { app, server, logger };
}

export function createMcpHttpServer(options: { name?: string; version?: string } = {}) {
  const { app } = createMcpApp(options);
  const httpServer = createServer(app);
  return { httpServer, app };
}
