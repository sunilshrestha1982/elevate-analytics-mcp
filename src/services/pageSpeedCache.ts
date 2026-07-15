import { RedisBackedCache } from '../lib/cache.js';

export class RedisPageSpeedCache extends RedisBackedCache {
  constructor() {
    super('pagespeed');
  }
}

export const InMemoryPageSpeedCache = RedisPageSpeedCache;
