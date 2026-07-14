import { RedisBackedCache } from '../lib/cache.js';

export class InMemoryGoogleAnalyticsCache extends RedisBackedCache {
  constructor() {
    super('google-analytics', process.env.REDIS_URL);
  }
}
