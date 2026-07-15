import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolRegistry } from './toolRegistry.js';
import type { ResourceRegistry } from './resourceRegistry.js';
import type { PromptRegistry } from './promptRegistry.js';
import type { Logger } from './logger.js';
import { randomUUID } from 'node:crypto';

export function createRouter({ server, toolRegistry: _toolRegistry, resourceRegistry: _resourceRegistry, promptRegistry: _promptRegistry, logger }: { server: McpServer; toolRegistry: ToolRegistry; resourceRegistry: ResourceRegistry; promptRegistry: PromptRegistry; logger: Logger }) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ protocol: 'mcp', capabilities: ['tools', 'resources', 'prompts', 'streaming'] });
  });

  router.post('/', async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
        onsessioninitialized: (sessionId) => logger.info('MCP session initialized', { sessionId }),
      });
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      await server.connect(transport);
      await transport.handleRequest(req as never, res as never, req.body);
      logger.info('MCP request handled', {
        path: '/mcp',
        sessionId,
        requestId: req.context?.requestId ?? req.id,
        traceId: req.context?.traceId,
        authenticatedUser: req.context?.userEmail,
      });
    } catch (error) {
      const errorId = randomUUID();
      logger.error('MCP request failed', {
        errorId,
        requestId: req.context?.requestId ?? req.id,
        traceId: req.context?.traceId,
        authenticatedUser: req.context?.userEmail,
        error,
      });
      res.status(500).json({ error: 'MCP request failed', errorId });
    }
  });

  return router;
}
