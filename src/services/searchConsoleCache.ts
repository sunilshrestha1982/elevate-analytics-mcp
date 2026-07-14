import { RedisBackedCache } from '../lib/cache.js';

export class InMemorySearchConsoleCache extends RedisBackedCache {
  constructor() {
    super('search-console', process.env.REDIS_URL);
  }
}
