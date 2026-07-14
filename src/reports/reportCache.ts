import { RedisBackedCache } from '../lib/cache.js';

export interface ReportCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

export class InMemoryReportCache extends RedisBackedCache implements ReportCache {
  constructor() {
    super('report-engine', process.env.REDIS_URL);
  }
}
