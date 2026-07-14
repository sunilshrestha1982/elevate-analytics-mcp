import { logger } from '../lib/logger.js';
import type { GoogleAnalyticsService } from '../services/googleAnalyticsService.js';
import type { PageSpeedService } from '../services/pageSpeedService.js';
import type { SearchConsoleService } from '../services/searchConsoleService.js';
import type { SEOInsightService } from '../services/seoInsightService.js';
import type { ReportRequest, ReportSnapshot } from './types.js';

export interface ReportRepository {
  fetchSnapshot(request: ReportRequest): Promise<ReportSnapshot>;
}

export interface ReportRepositoryDependencies {
  searchConsoleService: Pick<SearchConsoleService, 'topQueries' | 'topPages'>;
  googleAnalyticsService: Pick<GoogleAnalyticsService, 'sessions' | 'landingPages' | 'trafficSources' | 'conversions'>;
  pageSpeedService: Pick<PageSpeedService, 'analyzeUrl'>;
  seoInsightService: Pick<SEOInsightService, 'weeklySummary' | 'monthlySummary' | 'quarterlySummary'>;
}

function safeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export class DefaultReportRepository implements ReportRepository {
  constructor(private readonly deps: ReportRepositoryDependencies) {}

  async fetchSnapshot(request: ReportRequest): Promise<ReportSnapshot> {
    const endDate = request.endDate ?? new Date().toISOString().slice(0, 10);
    const startDate = request.startDate ?? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateInput = {
      startDate,
      endDate,
      comparisonStartDate: request.comparisonStartDate,
      comparisonEndDate: request.comparisonEndDate,
      page: 1,
      limit: 10,
    };

    const siteUrl = request.siteUrl ?? 'https://example.com';
    const propertyId = request.propertyId ?? 'unknown-property';
    const url = request.url ?? siteUrl;

    const [queries, pages, sessions, landingPages, trafficSources, conversions, pageSpeed, seoSummary] = await Promise.all([
      this.withRetry(() => this.deps.searchConsoleService.topQueries(request.userId, siteUrl, dateInput), { source: 'search-console:topQueries' }),
      this.withRetry(() => this.deps.searchConsoleService.topPages(request.userId, siteUrl, dateInput), { source: 'search-console:topPages' }),
      this.withRetry(() => this.deps.googleAnalyticsService.sessions(request.userId, propertyId, dateInput), { source: 'ga4:sessions' }),
      this.withRetry(() => this.deps.googleAnalyticsService.landingPages(request.userId, propertyId, dateInput), { source: 'ga4:landing-pages' }),
      this.withRetry(() => this.deps.googleAnalyticsService.trafficSources(request.userId, propertyId, dateInput), { source: 'ga4:traffic-sources' }),
      this.withRetry(() => this.deps.googleAnalyticsService.conversions(request.userId, propertyId, dateInput), { source: 'ga4:conversions' }),
      this.withRetry(() => this.deps.pageSpeedService.analyzeUrl(request.userId, url, { strategy: 'mobile' }), { source: 'pagespeed:analyze' }),
      this.getSummaryByReportType(request),
    ]);

    return {
      searchConsole: {
        summary: {
          clicks: safeNumber(queries.summary.clicks),
          impressions: safeNumber(queries.summary.impressions),
          ctr: safeNumber(queries.summary.ctr),
          position: safeNumber(queries.summary.position),
        },
        topQueries: queries.rows.map((row) => ({
          query: String(row.query),
          clicks: safeNumber(row.clicks),
          impressions: safeNumber(row.impressions),
          ctr: safeNumber(row.ctr),
          position: safeNumber(row.position),
        })),
        topPages: pages.rows.map((row) => ({
          page: String(row.page),
          clicks: safeNumber(row.clicks),
          impressions: safeNumber(row.impressions),
          ctr: safeNumber(row.ctr),
          position: safeNumber(row.position),
        })),
      },
      analytics: {
        summary: {
          sessions: safeNumber(sessions.summary.sessions),
          users: safeNumber(sessions.summary.users),
          conversions: safeNumber(conversions.summary.conversions),
          engagementRate: safeNumber(sessions.summary.engagementRate),
        },
        landingPages: landingPages.rows.map((row) => ({
          page: String(row.dimensions.pagePath ?? row.dimensions.page ?? '/'),
          sessions: safeNumber(row.metrics.sessions),
          bounceRate: safeNumber(row.metrics.bounceRate),
        })),
        channels: trafficSources.rows.map((row) => ({
          channel: String(row.dimensions.sessionSource ?? row.dimensions.defaultChannelGroup ?? 'unknown'),
          sessions: safeNumber(row.metrics.sessions),
        })),
      },
      pageSpeed: {
        scorecard: pageSpeed.scorecard,
        opportunities: pageSpeed.opportunities,
      },
      seoIntelligence: {
        title: seoSummary.title,
        scorecard: seoSummary.scorecard,
        highlights: seoSummary.highlights,
      },
    };
  }

  private async getSummaryByReportType(request: ReportRequest) {
    const siteUrl = request.siteUrl ?? 'https://example.com';
    const propertyId = request.propertyId ?? 'unknown-property';
    const input = {
      startDate: request.startDate,
      endDate: request.endDate,
      comparisonStartDate: request.comparisonStartDate,
      comparisonEndDate: request.comparisonEndDate,
    };

    if (request.reportType === 'monthly-seo-report') {
      return this.withRetry(() => this.deps.seoInsightService.monthlySummary(request.userId, siteUrl, propertyId, input), { source: 'seo:monthly-summary' });
    }
    if (request.reportType === 'quarterly-seo-report') {
      return this.withRetry(() => this.deps.seoInsightService.quarterlySummary(request.userId, siteUrl, propertyId, input), { source: 'seo:quarterly-summary' });
    }
    return this.withRetry(() => this.deps.seoInsightService.weeklySummary(request.userId, siteUrl, propertyId, input), { source: 'seo:weekly-summary' });
  }

  private async withRetry<T>(operation: () => Promise<T>, context: Record<string, unknown>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < 3) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const transient = /429|500|502|503|504|timeout|temporar|quota/i.test(message);
        if (!transient || attempt === 2) break;

        const delayMs = 250 * 2 ** attempt;
        logger.warn('Retrying report repository operation', { ...context, attempt: attempt + 1, delayMs, message });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt += 1;
      }
    }

    logger.error('Report repository operation failed', { ...context, error: lastError });
    throw lastError;
  }
}
