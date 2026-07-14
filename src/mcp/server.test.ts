import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

describe('MCP server', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves public health/readiness/liveness endpoints', async () => {
    const { createMcpApp } = await import('./server.js');
    const { app } = createMcpApp();
    const health = await request(app).get('/health');
    const ready = await request(app).get('/ready');
    const live = await request(app).get('/live');
    expect(health.status).toBe(200);
    expect(ready.status).toBe(200);
    expect(live.status).toBe(200);
  });

  it('fails closed for protected endpoints when MCP_API_KEY is not configured', async () => {
    const { createMcpApp } = await import('./server.js');
    const { app } = createMcpApp();
    const response = await request(app).get('/mcp');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('MCP_API_KEY is not configured');
  });

  it('protects MCP endpoints with API key when MCP_API_KEY is configured', async () => {
    vi.resetModules();
    vi.stubEnv('MCP_API_KEY', 'test-mcp-key-1234567890');
    const { createMcpApp } = await import('./server.js');
    const { app } = createMcpApp();

    const unauthorized = await request(app).get('/mcp');
    const authorized = await request(app).get('/mcp').set('x-api-key', 'test-mcp-key-1234567890');

    expect(unauthorized.status).toBe(401);
    expect(authorized.status).toBe(200);
    expect(authorized.body.protocol).toBe('mcp');
  });
});
