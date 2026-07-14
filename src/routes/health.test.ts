import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { healthRouter } from './health.js';
import { systemHealthService } from '../services/systemHealthService.js';

describe('healthRouter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns full dependency status from /health', async () => {
    vi.spyOn(systemHealthService, 'getHealth').mockResolvedValue({
      status: 'degraded',
      timestamp: '2026-07-15T00:00:00.000Z',
      components: {
        database: { status: 'ok', message: 'database connected' },
        oauth: { status: 'error', message: 'GOOGLE_CLIENT_ID is not configured' },
        searchConsole: { status: 'error', message: 'search console dependency unavailable: GOOGLE_CLIENT_ID is not configured' },
        ga4: { status: 'error', message: 'google analytics dependency unavailable: GOOGLE_CLIENT_ID is not configured' },
      },
    });

    const app = express();
    app.use('/health', healthRouter);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'degraded',
      timestamp: '2026-07-15T00:00:00.000Z',
      components: {
        database: { status: 'ok', message: 'database connected' },
        oauth: { status: 'error', message: 'GOOGLE_CLIENT_ID is not configured' },
        searchConsole: { status: 'error', message: 'search console dependency unavailable: GOOGLE_CLIENT_ID is not configured' },
        ga4: { status: 'error', message: 'google analytics dependency unavailable: GOOGLE_CLIENT_ID is not configured' },
      },
    });
  });

  it('returns 503 from /health when the overall health is error', async () => {
    vi.spyOn(systemHealthService, 'getHealth').mockResolvedValue({
      status: 'error',
      timestamp: '2026-07-15T00:00:00.000Z',
      components: {
        database: { status: 'error', message: 'database not reachable: connection refused' },
        oauth: { status: 'ok', message: 'oauth configured' },
        searchConsole: { status: 'ok', message: 'search console dependency configured via Google OAuth' },
        ga4: { status: 'ok', message: 'google analytics dependency configured via Google OAuth' },
      },
    });

    const app = express();
    app.use('/health', healthRouter);

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.components.database.status).toBe('error');
  });
});
