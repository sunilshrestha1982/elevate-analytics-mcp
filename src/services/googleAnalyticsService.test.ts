import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAnalyticsService } from './googleAnalyticsService.js';
import { InMemoryGoogleAnalyticsCache } from './googleAnalyticsCache.js';
import { GoogleAnalyticsValidator } from './googleAnalyticsValidator.js';
import { GoogleAnalyticsMapper } from './googleAnalyticsMapper.js';

class MockGoogleAnalyticsRepository {
  listProperties = vi.fn();
  getProperty = vi.fn();
  runReport = vi.fn();
}

describe('GoogleAnalyticsService', () => {
  let repository: MockGoogleAnalyticsRepository;
  let service: GoogleAnalyticsService;

  beforeEach(() => {
    repository = new MockGoogleAnalyticsRepository();
    service = new GoogleAnalyticsService({
      repository: repository as any,
      cache: new InMemoryGoogleAnalyticsCache(),
      validator: new GoogleAnalyticsValidator(),
      mapper: new GoogleAnalyticsMapper(),
      tokenProvider: async () => 'token-123',
    });
  });

  it('lists properties and caches the result', async () => {
    repository.listProperties.mockResolvedValue([
      { propertyId: '123', displayName: 'Example App', accountId: 'acc-1' },
    ]);

    const result = await service.listProperties(42);

    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Example App');
    expect(repository.listProperties).toHaveBeenCalledTimes(1);
  });

  it('returns paginated report rows with sorting', async () => {
    repository.runReport.mockResolvedValue({
      rows: [
        { dimensionValues: [{ value: 'organic' }], metricValues: [{ value: '12' }] },
        { dimensionValues: [{ value: 'direct' }], metricValues: [{ value: '8' }] },
      ],
      totals: [{ metricName: 'sessions', value: 20 }],
    });

    const result = await service.trafficSources(42, '123', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      dimensions: ['sessionSource'],
      metrics: ['sessions'],
      page: 1,
      limit: 1,
      sort: 'sessions',
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].dimensions.sessionSource).toBe('organic');
    expect(result.summary.sessions).toBe(20);
  });

  it('compares historical periods and calculates deltas', async () => {
    repository.runReport
      .mockResolvedValueOnce({
        rows: [{ dimensionValues: [], metricValues: [{ value: '10' }] }],
        totals: [{ metricName: 'sessions', value: 10 }],
      })
      .mockResolvedValueOnce({
        rows: [{ dimensionValues: [], metricValues: [{ value: '8' }] }],
        totals: [{ metricName: 'sessions', value: 8 }],
      });

    const result = await service.dateComparison(42, '123', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      comparisonStartDate: '2023-12-01',
      comparisonEndDate: '2023-12-31',
      metrics: ['sessions'],
    });

    expect(result.current.sessions).toBe(10);
    expect(result.previous.sessions).toBe(8);
    expect(result.delta.sessions).toBe(2);
  });
});
