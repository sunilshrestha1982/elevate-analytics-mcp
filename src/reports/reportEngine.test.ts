import { describe, expect, it } from 'vitest';
import { ReportEngine } from './reportEngine.js';
import type { ReportRepository } from './reportRepository.js';
import type { ReportRequest, ReportSnapshot, ReportType } from './types.js';

class StubRepository implements ReportRepository {
  public calls = 0;

  async fetchSnapshot(_request: ReportRequest): Promise<ReportSnapshot> {
    this.calls += 1;
    return {
      searchConsole: {
        summary: { clicks: 1200, impressions: 28000, ctr: 0.042, position: 8.4 },
        topQueries: [{ query: 'seo analytics', clicks: 210, impressions: 4000, ctr: 0.052, position: 6.4 }],
        topPages: [{ page: '/seo-audit', clicks: 180, impressions: 3200, ctr: 0.056, position: 7.1 }],
      },
      analytics: {
        summary: { sessions: 5400, users: 4200, conversions: 190, engagementRate: 0.61 },
        landingPages: [{ page: '/seo-audit', sessions: 1200, bounceRate: 0.42 }],
        channels: [{ channel: 'organic', sessions: 4600 }],
      },
      pageSpeed: {
        scorecard: {
          technicalSeoScore: 81,
          performanceScore: 76,
          coreWebVitalsScore: 79,
          accessibilityScore: 88,
          overallSiteHealthScore: 81,
        },
        opportunities: [{ category: 'render-blocking-resources', score: 0.45 }],
      },
      seoIntelligence: {
        title: 'Weekly SEO summary',
        scorecard: { seoHealth: 79, opportunity: 83, technical: 78, content: 82, growth: 84 },
        highlights: ['Strong growth trend across top pages'],
      },
    };
  }
}

const reportTypes: ReportType[] = [
  'weekly-seo-report',
  'monthly-seo-report',
  'quarterly-seo-report',
  'technical-seo-audit',
  'content-audit',
  'landing-page-audit',
  'keyword-opportunity-report',
  'traffic-loss-report',
  'traffic-growth-report',
  'website-health-report',
  'competitor-comparison',
  'executive-dashboard',
];

describe('ReportEngine', () => {
  it('generates all requested report types with required sections', async () => {
    const repository = new StubRepository();
    const engine = new ReportEngine({ repository });

    for (const reportType of reportTypes) {
      const result = await engine.generate({
        userId: 42,
        reportType,
        siteUrl: 'https://example.com',
        propertyId: '123',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result.report.title.length).toBeGreaterThan(0);
      expect(result.report.executiveSummary.length).toBeGreaterThan(0);
      expect(result.report.keyMetrics.length).toBeGreaterThan(0);
      expect(result.report.keyChanges.length).toBeGreaterThan(0);
      expect(result.report.insights.length).toBeGreaterThan(0);
      expect(result.report.rootCauseAnalysis.length).toBeGreaterThan(0);
      expect(result.report.recommendations.length).toBeGreaterThan(0);
      expect(result.report.priorityMatrix).toBeDefined();
      expect(result.report.estimatedImpact.length).toBeGreaterThan(0);
      expect(result.report.estimatedEffort.length).toBeGreaterThan(0);
      expect(result.report.actionPlan.length).toBeGreaterThan(0);
      expect(result.report.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.report.scores.overallBusinessScore).toBeGreaterThanOrEqual(0);
      expect(result.report.scores.overallBusinessScore).toBeLessThanOrEqual(100);
    }
  });

  it('renders markdown and html outputs including PDF-ready markup', async () => {
    const engine = new ReportEngine({ repository: new StubRepository() });
    const input: ReportRequest = {
      userId: 42,
      reportType: 'weekly-seo-report',
      siteUrl: 'https://example.com',
      propertyId: '123',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    };

    const markdown = await engine.generate(input, 'markdown');
    const html = await engine.generate(input, 'html');

    expect(markdown.content).toContain('## Executive Summary');
    expect(markdown.content).toContain('## Priority Matrix');
    expect(html.content).toContain('<style>');
    expect(html.content).toContain('@page { size: A4;');
    expect(html.content).toContain('<h2>Action Plan</h2>');
  });

  it('uses cache for repeated requests', async () => {
    const repository = new StubRepository();
    const engine = new ReportEngine({ repository });

    const request: ReportRequest = {
      userId: 99,
      reportType: 'website-health-report',
      siteUrl: 'https://example.com',
      propertyId: 'prop',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    };

    await engine.generate(request, 'json');
    await engine.generate(request, 'json');

    expect(repository.calls).toBe(1);
  });
});
