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

export class RedisBackedCache implements SyncCache {
  private readonly values = new Map<string, CacheEntry>();
  private readonly client?: RedisClientType;
  private isRedisReady = false;

  constructor(private readonly namespace: string, redisUrl?: string) {
    if (!redisUrl) return;

    this.client = createClient({ url: redisUrl });
    this.client.on('error', (error) => {
      this.isRedisReady = false;
      logger.warn('Redis cache unavailable, using in-memory fallback', {
        namespace: this.namespace,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    this.client.on('ready', () => {
      this.isRedisReady = true;
      logger.info('Redis cache connected', { namespace: this.namespace });
    });
    this.client.connect().catch((error) => {
      this.isRedisReady = false;
      logger.warn('Redis cache connection failed, using in-memory fallback', {
        namespace: this.namespace,
        error: error instanceof Error ? error.message : String(error),
      });
    });
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
  return new RedisBackedCache(namespace, process.env.REDIS_URL);
}
