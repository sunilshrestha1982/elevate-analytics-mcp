import { describe, expect, it } from 'vitest';
import { SystemHealthService } from './systemHealthService.js';

describe('SystemHealthService', () => {
  it('returns ok when all dependencies are healthy', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_REDIRECT_URI: 'https://example.com/oauth/callback',
        REDIS_URL: undefined,
      },
      checkDatabase: async () => ({ status: 'ok' }),
      checkRedis: async () => ({ status: 'ok' }),
      checkCache: () => ({ status: 'ok' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('healthy');
    expect(health.database).toBe('ok');
    expect(health.oauth).toBe('ok');
    expect(health.searchConsole).toBe('ok');
    expect(health.analytics).toBe('ok');
    expect(health.cache).toBe('ok');
    expect(health.version).toBe('1.0.0');
  });

  it('returns unhealthy when oauth-backed dependencies are not configured', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        GOOGLE_REDIRECT_URI: undefined,
        REDIS_URL: undefined,
      },
      checkDatabase: async () => ({ status: 'ok' }),
      checkRedis: async () => ({ status: 'ok' }),
      checkCache: () => ({ status: 'ok' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('unhealthy');
    expect(health.database).toBe('ok');
    expect(health.oauth).toBe('error');
    expect(health.searchConsole).toBe('error');
    expect(health.analytics).toBe('error');
    expect(health.cache).toBe('ok');
  });

  it('returns error when the database check fails', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_REDIRECT_URI: 'https://example.com/oauth/callback',
        REDIS_URL: undefined,
      },
      checkDatabase: async () => ({ status: 'error', error: 'connection refused' }),
      checkRedis: async () => ({ status: 'ok' }),
      checkCache: () => ({ status: 'ok' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('unhealthy');
    expect(health.database).toBe('error');
    expect(health.oauth).toBe('ok');
  });

  it('returns unhealthy when redis is enabled but unavailable', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_REDIRECT_URI: 'https://example.com/oauth/callback',
        REDIS_URL: 'redis://127.0.0.1:6379',
      },
      checkDatabase: async () => ({ status: 'ok' }),
      checkRedis: async () => ({ status: 'error', error: 'connection refused' }),
      checkCache: () => ({ status: 'ok' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('unhealthy');
    expect(health.cache).toBe('error');
  });
});
