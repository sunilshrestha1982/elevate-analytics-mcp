import { z } from 'zod';
import { createClient } from 'redis';
import { getEnv, type Env } from '../config/env.js';
import { databaseService } from './databaseService.js';
import { RedisBackedCache } from '../lib/cache.js';

const dependencyStatusSchema = z.enum(['ok', 'error']);

const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  database: dependencyStatusSchema,
  oauth: dependencyStatusSchema,
  searchConsole: dependencyStatusSchema,
  analytics: dependencyStatusSchema,
  cache: dependencyStatusSchema,
  version: z.literal('1.0.0'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

type HealthConfig = Pick<Env, 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI' | 'REDIS_URL'>;

type DependencyCheckResult = {
  status: 'ok' | 'error';
  error?: string;
};

type SystemHealthServiceDependencies = {
  config: HealthConfig | (() => HealthConfig);
  checkDatabase: () => Promise<DependencyCheckResult>;
  checkRedis: (redisUrl?: string) => Promise<DependencyCheckResult>;
  checkCache: () => DependencyCheckResult;
};

const HEALTH_VERSION = '1.0.0';

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

const defaultCheckRedis = async (redisUrl?: string): Promise<DependencyCheckResult> => {
  if (!redisUrl) {
    return { status: 'ok' };
  }

  const client = createClient({ url: redisUrl });
  try {
    await withTimeout(client.connect(), 1500, 'redis connect');
    const pong = await withTimeout(client.ping(), 1500, 'redis ping');
    if (pong !== 'PONG') {
      return { status: 'error', error: 'unexpected ping response' };
    }
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'redis check failed',
    };
  } finally {
    if (client.isOpen) {
      await client.quit().catch(() => client.disconnect());
    }
  }
};

const defaultCheckCache = (): DependencyCheckResult => {
  const cache = new RedisBackedCache('health-check');
  const key = `health-${Date.now()}`;
  cache.set(key, 'ok', 30_000);
  const value = cache.get<string>(key);
  cache.delete(key);

  if (value !== 'ok') {
    return { status: 'error', error: 'cache roundtrip failed' };
  }

  return { status: 'ok' };
};

const isOAuthConfigured = (config: HealthConfig) => {
  return Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_REDIRECT_URI);
};

export class SystemHealthService {
  constructor(private readonly deps: SystemHealthServiceDependencies = {
    config: () => getEnv(),
    checkDatabase: async () => {
      const result = await databaseService.checkHealth();
      return {
        status: result.status === 'ok' ? 'ok' : 'error',
        error: result.error,
      };
    },
    checkRedis: defaultCheckRedis,
    checkCache: defaultCheckCache,
  }) {}

  async getHealth(): Promise<HealthResponse> {
    const config = typeof this.deps.config === 'function' ? this.deps.config() : this.deps.config;
    const database = await this.deps.checkDatabase();
    const oauthStatus: 'ok' | 'error' = isOAuthConfigured(config) ? 'ok' : 'error';
    const searchConsoleStatus: 'ok' | 'error' = oauthStatus === 'ok' ? 'ok' : 'error';
    const analyticsStatus: 'ok' | 'error' = oauthStatus === 'ok' ? 'ok' : 'error';
    const redis = config.REDIS_URL ? await this.deps.checkRedis(config.REDIS_URL) : { status: 'ok' as const };
    const cacheRoundtrip = config.REDIS_URL ? this.deps.checkCache() : { status: 'ok' as const };
    const cacheStatus: 'ok' | 'error' = redis.status === 'ok' && cacheRoundtrip.status === 'ok' ? 'ok' : 'error';

    const healthy = database.status === 'ok' && oauthStatus === 'ok' && searchConsoleStatus === 'ok' && analyticsStatus === 'ok' && cacheStatus === 'ok';

    const response: HealthResponse = {
      status: healthy ? 'healthy' : 'unhealthy',
      database: database.status,
      oauth: oauthStatus,
      searchConsole: searchConsoleStatus,
      analytics: analyticsStatus,
      cache: cacheStatus,
      version: HEALTH_VERSION,
    };

    return healthResponseSchema.parse(response);
  }
}

export const systemHealthService = new SystemHealthService();
