import { RedisBackedCache } from '../lib/cache.js';

export class RedisGoogleAnalyticsCache extends RedisBackedCache {
  constructor() {
    super('google-analytics');
  }
}

export const InMemoryGoogleAnalyticsCache = RedisGoogleAnalyticsCache;
