import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const mcpServer = new McpServer({
  name: 'elevate-analytics-mcp',
  version: '0.1.0',
});

mcpServer.tool('ping', async () => ({
  content: [{ type: 'text', text: 'pong' }],
}));
