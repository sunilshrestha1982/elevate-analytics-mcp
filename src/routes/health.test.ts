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
      status: 'unhealthy',
      database: 'ok',
      oauth: 'error',
      searchConsole: 'error',
      analytics: 'error',
      cache: 'ok',
      version: '1.0.0',
    });

    const app = express();
    app.use('/health', healthRouter);

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      database: 'ok',
      oauth: 'error',
      searchConsole: 'error',
      analytics: 'error',
      cache: 'ok',
      version: '1.0.0',
    });
  });

  it('returns 503 from /health when the overall health is error', async () => {
    vi.spyOn(systemHealthService, 'getHealth').mockResolvedValue({
      status: 'unhealthy',
      database: 'error',
      oauth: 'ok',
      searchConsole: 'ok',
      analytics: 'ok',
      cache: 'ok',
      version: '1.0.0',
    });

    const app = express();
    app.use('/health', healthRouter);

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.database).toBe('error');
  });
});
