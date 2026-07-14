import { z } from 'zod';
import { env } from '../config/env.js';
import { databaseService } from './databaseService.js';

const componentSchema = z.object({
  status: z.enum(['ok', 'error']),
  message: z.string(),
});

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string(),
  components: z.object({
    database: componentSchema,
    oauth: componentSchema,
    searchConsole: componentSchema,
    ga4: componentSchema,
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

type HealthConfig = Pick<typeof env, 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI'>;

type DatabaseHealthResult = {
  status: 'ok' | 'error';
  error?: string;
};

type SystemHealthServiceDependencies = {
  config: HealthConfig;
  checkDatabase: () => Promise<DatabaseHealthResult>;
};

function checkConfigured(value: string | undefined, name: string) {
  if (!value) {
    return { status: 'error' as const, message: `${name} is not configured` };
  }
  return { status: 'ok' as const, message: `${name} configured` };
}

export class SystemHealthService {
  constructor(private readonly deps: SystemHealthServiceDependencies = {
    config: env,
    checkDatabase: async () => {
      const result = await databaseService.checkHealth();
      return {
        status: result.status === 'ok' ? 'ok' : 'error',
        error: result.error,
      };
    },
  }) {}

  private getOAuthComponent() {
    const checks = [
      checkConfigured(this.deps.config.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
      checkConfigured(this.deps.config.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
      checkConfigured(this.deps.config.GOOGLE_REDIRECT_URI, 'GOOGLE_REDIRECT_URI'),
    ];

    const missing = checks.filter((item) => item.status === 'error').map((item) => item.message);
    return {
      status: missing.length === 0 ? 'ok' as const : 'error' as const,
      message: missing.length === 0 ? 'oauth configured' : missing.join(', '),
      missing,
    };
  }

  private getSearchConsoleComponent(oauth: ReturnType<SystemHealthService['getOAuthComponent']>) {
    if (oauth.status === 'ok') {
      return { status: 'ok' as const, message: 'search console dependency configured via Google OAuth' };
    }

    return {
      status: 'error' as const,
      message: `search console dependency unavailable: ${oauth.message}`,
    };
  }

  private getGa4Component(oauth: ReturnType<SystemHealthService['getOAuthComponent']>) {
    if (oauth.status === 'ok') {
      return { status: 'ok' as const, message: 'google analytics dependency configured via Google OAuth' };
    }

    return {
      status: 'error' as const,
      message: `google analytics dependency unavailable: ${oauth.message}`,
    };
  }

  async getHealth(): Promise<HealthResponse> {
    const db = await this.deps.checkDatabase();
    const oauth = this.getOAuthComponent();
    const searchConsole = this.getSearchConsoleComponent(oauth);
    const ga4 = this.getGa4Component(oauth);

    const allDependenciesOk = db.status === 'ok' && oauth.status === 'ok' && searchConsole.status === 'ok' && ga4.status === 'ok';
    const anyDependencyError = db.status === 'error' || oauth.status === 'error' || searchConsole.status === 'error' || ga4.status === 'error';

    const response: HealthResponse = {
      status: allDependenciesOk ? 'ok' : db.status === 'error' ? 'error' : anyDependencyError ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: db.status === 'ok' ? 'ok' : 'error',
          message: db.status === 'ok' ? 'database connected' : `database not reachable${db.error ? `: ${db.error}` : ''}`,
        },
        oauth: {
          status: oauth.status,
          message: oauth.message,
        },
        searchConsole: {
          status: searchConsole.status,
          message: searchConsole.message,
        },
        ga4: {
          status: ga4.status,
          message: ga4.message,
        },
      },
    };

    return healthResponseSchema.parse(response);
  }
}

export const systemHealthService = new SystemHealthService();
