import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchConsoleService } from './searchConsoleService.js';
import { InMemorySearchConsoleCache } from './searchConsoleCache.js';
import { SearchConsoleValidator } from './searchConsoleValidator.js';
import { SearchConsoleMapper } from './searchConsoleMapper.js';

class MockSearchConsoleRepository {
  listSites = vi.fn();
  queryAnalytics = vi.fn();
}

describe('SearchConsoleService', () => {
  let repository: MockSearchConsoleRepository;
  let service: SearchConsoleService;

  beforeEach(() => {
    repository = new MockSearchConsoleRepository();
    service = new SearchConsoleService({
      repository: repository as any,
      cache: new InMemorySearchConsoleCache(),
      validator: new SearchConsoleValidator(),
      mapper: new SearchConsoleMapper(),
      tokenProvider: async () => 'token-123',
    });
  });

  it('lists sites and caches the result', async () => {
    repository.listSites.mockResolvedValue([{ siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' }]);

    const result = await service.listSites(42);

    expect(result).toEqual([{ siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' }]);
    expect(repository.listSites).toHaveBeenCalledTimes(1);
  });

  it('returns top queries with pagination and filtering', async () => {
    repository.queryAnalytics.mockResolvedValue({
      rows: [
        { keys: ['buy shoes'], clicks: 40, impressions: 200, ctr: 0.2, position: 3 },
        { keys: ['cheap shoes'], clicks: 10, impressions: 100, ctr: 0.1, position: 5 },
      ],
      totals: { clicks: 50, impressions: 300, ctr: 0.15, position: 4 },
    });

    const result = await service.topQueries(42, 'https://example.com/', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      page: 1,
      limit: 1,
      regex: { query: 'buy' },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].query).toBe('buy shoes');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('compares date ranges and calculates deltas', async () => {
    repository.queryAnalytics
      .mockResolvedValueOnce({
        rows: [{ keys: ['widget'], clicks: 10, impressions: 100, ctr: 0.1, position: 3 }],
        totals: { clicks: 10, impressions: 100, ctr: 0.1, position: 3 },
      })
      .mockResolvedValueOnce({
        rows: [{ keys: ['widget'], clicks: 20, impressions: 200, ctr: 0.2, position: 2 }],
        totals: { clicks: 20, impressions: 200, ctr: 0.2, position: 2 },
      });

    const result = await service.compareDateRanges(42, 'https://example.com/', {
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      comparisonStartDate: '2024-01-16',
      comparisonEndDate: '2024-01-31',
    });

    expect(result.current.clicks).toBe(10);
    expect(result.previous.clicks).toBe(20);
    expect(result.deltaClicks).toBe(-10);
  });

  it('returns brand queries when a regex filter is supplied', async () => {
    repository.queryAnalytics.mockResolvedValue({
      rows: [
        { keys: ['acme shoes'], clicks: 30, impressions: 150, ctr: 0.2, position: 2 },
        { keys: ['cheap shoes'], clicks: 5, impressions: 50, ctr: 0.1, position: 6 },
      ],
      totals: { clicks: 35, impressions: 200, ctr: 0.15, position: 4 },
    });

    const result = await service.brandQueries(42, 'https://example.com/', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      regex: { query: 'acme' },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].query).toBe('acme shoes');
  });
});
