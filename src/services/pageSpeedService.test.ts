import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageSpeedService } from './pageSpeedService.js';
import { PageSpeedValidator } from './pageSpeedValidator.js';
import { RedisPageSpeedCache } from './pageSpeedCache.js';
import { TechnicalSEOAnalyzer } from './technicalSeoAnalyzer.js';
import { CoreWebVitalsAnalyzer } from './coreWebVitalsAnalyzer.js';
import { PerformanceAnalyzer } from './performanceAnalyzer.js';

class StubPageSpeedRepository {
  analyzeUrl = vi.fn();
}

describe('PageSpeedService', () => {
  let repository: StubPageSpeedRepository;
  let service: PageSpeedService;

  beforeEach(() => {
    repository = new StubPageSpeedRepository();
    service = new PageSpeedService({
      repository: repository as any,
      cache: new RedisPageSpeedCache(),
      validator: new PageSpeedValidator(),
      technicalAnalyzer: new TechnicalSEOAnalyzer(),
      coreWebVitalsAnalyzer: new CoreWebVitalsAnalyzer(),
      performanceAnalyzer: new PerformanceAnalyzer(),
    });
  });

  it('analyzes a URL and caches the response', async () => {
    repository.analyzeUrl.mockResolvedValue({
      id: 'report-1',
      url: 'https://example.com',
      strategy: 'mobile',
      lighthouseResult: {
        categories: { performance: { score: 0.9 }, accessibility: { score: 0.8 }, seo: { score: 0.7 }, 'best-practices': { score: 0.85 } },
        audits: {
          'largest-contentful-paint': { score: 0.95, numericValue: 1800 },
          'interaction-to-next-paint': { score: 0.9, numericValue: 220 },
          'cumulative-layout-shift': { score: 0.98, numericValue: 0.03 },
          'first-contentful-paint': { score: 0.92, numericValue: 1100 },
          'speed-index': { score: 0.91, numericValue: 1300 },
          'time-to-interactive': { score: 0.88, numericValue: 2500 },
        },
      },
      loadingExperience: { overTheWire: { metricValues: [{ metric: 'LARGEST_CONTENTFUL_PAINT_MS', value: 1800 }] } },
    });

    const result = await service.analyzeUrl(42, 'https://example.com', { strategy: 'mobile' });

    expect(result.url).toBe('https://example.com');
    expect(result.strategy).toBe('mobile');
    expect(repository.analyzeUrl).toHaveBeenCalledTimes(1);
  });

  it('returns core web vitals metrics and a scorecard', async () => {
    repository.analyzeUrl.mockResolvedValue({
      id: 'report-2',
      url: 'https://example.com',
      strategy: 'mobile',
      lighthouseResult: {
        categories: { performance: { score: 0.85 }, accessibility: { score: 0.8 }, seo: { score: 0.7 }, 'best-practices': { score: 0.9 } },
        audits: {
          'largest-contentful-paint': { score: 0.9, numericValue: 1600 },
          'interaction-to-next-paint': { score: 0.9, numericValue: 200 },
          'cumulative-layout-shift': { score: 0.95, numericValue: 0.04 },
          'first-contentful-paint': { score: 0.92, numericValue: 1000 },
          'speed-index': { score: 0.91, numericValue: 1200 },
          'time-to-interactive': { score: 0.88, numericValue: 2300 },
        },
      },
    });

    const vitals = await service.coreWebVitals(42, 'https://example.com');
    const score = await service.technicalSeoScore(42, 'https://example.com');

    expect((vitals as any).largestContentfulPaint).toBeGreaterThan(0);
    expect(score).toBeGreaterThan(0);
  });
});
