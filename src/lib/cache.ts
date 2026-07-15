import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger.js';
import { observeCacheAccess } from './metrics.js';

export interface SyncCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

const sharedRedisClients = new Map<string, RedisClientType>();
const redisReadyState = new Map<string, boolean>();

function createCloudRunSafeRedisClient(redisUrl: string) {
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
      keepAlive: true,
      keepAliveInitialDelay: 5000,
      reconnectStrategy: (retries) => {
        const capped = Math.min(retries, 5);
        return Math.min(1000 * 2 ** capped, 30_000);
      },
    },
    disableOfflineQueue: true,
    pingInterval: 30_000,
  });

  client.on('error', (error) => {
    redisReadyState.set(redisUrl, false);
    logger.warn('Shared Redis client error, falling back to in-memory cache', {
      redisUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  client.on('ready', () => {
    redisReadyState.set(redisUrl, true);
    logger.info('Shared Redis client connected');
  });

  return client;
}

function getSharedRedisClient(redisUrl: string) {
  const existing = sharedRedisClients.get(redisUrl);
  if (existing) {
    return existing;
  }

  const client = createCloudRunSafeRedisClient(redisUrl);
  sharedRedisClients.set(redisUrl, client);
  redisReadyState.set(redisUrl, false);
  client.connect().catch((error) => {
    redisReadyState.set(redisUrl, false);
    logger.warn('Shared Redis connection failed, using in-memory fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return client;
}

export class RedisBackedCache implements SyncCache {
  private readonly values = new Map<string, CacheEntry>();
  private readonly client?: RedisClientType;
  private readonly redisUrl?: string;

  constructor(private readonly namespace: string, redisUrl = process.env.REDIS_URL) {
    this.redisUrl = redisUrl;
    if (!redisUrl) return;
    this.client = getSharedRedisClient(redisUrl);
  }

  private get isRedisReady() {
    if (!this.redisUrl) return false;
    return redisReadyState.get(this.redisUrl) === true;
  }

  get<T>(key: string): T | undefined {
    const entry = this.values.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        observeCacheAccess(this.namespace, 'hit');
        return entry.value as T;
      }
      this.values.delete(key);
    }

    observeCacheAccess(this.namespace, 'miss');

    if (this.client && this.isRedisReady) {
      void this.client
        .get(this.getScopedKey(key))
        .then((raw) => {
          if (!raw) return;
          const parsed = JSON.parse(raw) as T;
          this.values.set(key, { value: parsed, expiresAt: Date.now() + 60_000 });
        })
        .catch((error) => {
          logger.warn('Redis cache read failed, using in-memory fallback', {
            namespace: this.namespace,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    return undefined;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });

    if (this.client && this.isRedisReady) {
      void this.client.set(this.getScopedKey(key), JSON.stringify(value), { PX: ttlMs }).catch((error) => {
        logger.warn('Redis cache write failed, using in-memory fallback', {
          namespace: this.namespace,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  delete(key: string): void {
    this.values.delete(key);

    if (this.client && this.isRedisReady) {
      void this.client.del(this.getScopedKey(key)).catch((error) => {
        logger.warn('Redis cache delete failed, using in-memory fallback', {
          namespace: this.namespace,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  private getScopedKey(key: string) {
    return `${this.namespace}:${key}`;
  }
}

export function createApplicationCache(namespace: string): SyncCache {
  return new RedisBackedCache(namespace);
}
