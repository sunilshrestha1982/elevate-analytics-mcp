import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from './logger.js';

export interface ResourceRegistry {
  registerAll(): void;
}

export function createResourceRegistry(server: McpServer, logger: Logger): ResourceRegistry {
  return {
    registerAll() {
      server.resource('seo-overview', 'resource://seo/overview', async () => ({
        contents: [{ uri: 'resource://seo/overview', text: JSON.stringify({ overview: 'SEO analytics overview' }) }],
      }));
      server.resource('health-check', 'resource://system/health', async () => ({
        contents: [{ uri: 'resource://system/health', text: JSON.stringify({ status: 'ok' }) }],
      }));
      logger.info('Registered MCP resources');
    },
  };
}
