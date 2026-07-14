import { beforeEach, describe, expect, it } from 'vitest';
import { SEOInsightService } from './seoInsightService.js';
import type { SEOInsightRepository, SearchConsoleSnapshot, AnalyticsSnapshot } from './seoInsightService.js';

class StubRepository implements SEOInsightRepository {
  async getSearchConsoleData() {
    return {
      rows: [
        { query: 'best shoes', page: '/shoes', clicks: 40, impressions: 5000, ctr: 0.008, position: 18 },
        { query: 'running shoes', page: '/running', clicks: 90, impressions: 1200, ctr: 0.075, position: 8 },
      ],
      summary: { clicks: 130, impressions: 6200, ctr: 0.04, position: 13 },
    } as SearchConsoleSnapshot;
  }

  async getAnalyticsData() {
    return {
      summary: { sessions: 1200, users: 950, conversions: 60, engagementRate: 0.62, bounceRate: 0.72, exitRate: 0.45 },
      landingPages: [
        { page: '/shoes', sessions: 400, exits: 220, bounceRate: 0.7 },
        { page: '/running', sessions: 800, exits: 150, bounceRate: 0.5 },
      ],
      channels: [{ name: 'Organic Search', sessions: 900, conversions: 50 }],
      countries: [{ name: 'US', sessions: 600, users: 500, conversions: 25 }],
      devices: [{ name: 'desktop', sessions: 700, users: 600 }],
      topKeywords: [{ query: 'best shoes', clicks: 40, impressions: 5000, ctr: 0.008, position: 18 }],
    } as AnalyticsSnapshot;
  }
}

describe('SEOInsightService', () => {
  let service: SEOInsightService;

  beforeEach(() => {
    service = new SEOInsightService({ repository: new StubRepository() });
  });

  it('detects traffic drops and produces recommendations', async () => {
    const insight = await service.trafficDropAnalysis(42, 'https://example.com', '123', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      comparisonStartDate: '2023-12-01',
      comparisonEndDate: '2023-12-31',
    });

    expect(insight.score).toBeGreaterThan(0);
    expect(insight.recommendations.length).toBeGreaterThan(0);
    expect(insight.severity).toBe('high');
  });

  it('flags high-impression low-CTR opportunities', async () => {
    const insight = await service.highImpressionLowCTR(42, 'https://example.com', '123', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    expect(insight.items.length).toBeGreaterThan(0);
    expect(insight.title).toContain('CTR');
  });

  it('returns a summarized weekly report with scores', async () => {
    const summary = await service.weeklySummary(42, 'https://example.com', '123', {
      startDate: '2024-01-01',
      endDate: '2024-01-07',
    });

    expect(summary.scorecard.seoHealth).toBeGreaterThanOrEqual(0);
    expect(summary.scorecard.opportunity).toBeGreaterThanOrEqual(0);
  });
});
