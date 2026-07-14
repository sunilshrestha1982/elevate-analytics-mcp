import { describe, expect, it } from 'vitest';
import { SystemHealthService } from './systemHealthService.js';

describe('SystemHealthService', () => {
  it('returns ok when all dependencies are healthy', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_REDIRECT_URI: 'https://example.com/oauth/callback',
      },
      checkDatabase: async () => ({ status: 'ok' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.components.database.status).toBe('ok');
    expect(health.components.oauth.status).toBe('ok');
    expect(health.components.searchConsole.status).toBe('ok');
    expect(health.components.ga4.status).toBe('ok');
  });

  it('returns degraded when oauth-backed dependencies are not configured', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        GOOGLE_REDIRECT_URI: undefined,
      },
      checkDatabase: async () => ({ status: 'ok' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('degraded');
    expect(health.components.database.status).toBe('ok');
    expect(health.components.oauth.status).toBe('error');
    expect(health.components.oauth.message).toContain('GOOGLE_CLIENT_ID is not configured');
    expect(health.components.searchConsole.status).toBe('error');
    expect(health.components.searchConsole.message).toContain('search console dependency unavailable');
    expect(health.components.ga4.status).toBe('error');
    expect(health.components.ga4.message).toContain('google analytics dependency unavailable');
  });

  it('returns error when the database check fails', async () => {
    const service = new SystemHealthService({
      config: {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_REDIRECT_URI: 'https://example.com/oauth/callback',
      },
      checkDatabase: async () => ({ status: 'error', error: 'connection refused' }),
    });

    const health = await service.getHealth();

    expect(health.status).toBe('error');
    expect(health.components.database.status).toBe('error');
    expect(health.components.database.message).toContain('connection refused');
    expect(health.components.oauth.status).toBe('ok');
  });
});
