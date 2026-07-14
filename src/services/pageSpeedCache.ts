import { RedisBackedCache } from '../lib/cache.js';

export class InMemoryPageSpeedCache extends RedisBackedCache {
  constructor() {
    super('pagespeed', process.env.REDIS_URL);
  }
}
