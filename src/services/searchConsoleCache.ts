import { RedisBackedCache } from '../lib/cache.js';

export class RedisSearchConsoleCache extends RedisBackedCache {
  constructor() {
    super('search-console');
  }
}

export const InMemorySearchConsoleCache = RedisSearchConsoleCache;
