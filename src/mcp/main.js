import { createMcpHttpServer } from './server.js';

const port = Number(process.env.PORT || 8080);

const { httpServer } = createMcpHttpServer({
  name: 'elevate-analytics-mcp',
  version: '1.0.0',
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`MCP Server listening on port ${port}`);
});
