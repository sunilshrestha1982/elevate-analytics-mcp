import { logger } from '../lib/logger.js';
import { GoogleAnalyticsValidator, type GoogleAnalyticsReportInput } from './googleAnalyticsValidator.js';
import { GoogleAnalyticsMapper } from './googleAnalyticsMapper.js';
import { InMemoryGoogleAnalyticsCache } from './googleAnalyticsCache.js';

export interface GoogleAnalyticsRow {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export interface GoogleAnalyticsSummary {
  [key: string]: number;
}

export interface GoogleAnalyticsPaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  summary: GoogleAnalyticsSummary;
}

export interface GoogleAnalyticsComparisonResult {
  current: GoogleAnalyticsSummary;
  previous: GoogleAnalyticsSummary;
  delta: GoogleAnalyticsSummary;
}

export interface GoogleAnalyticsPropertyLike {
  propertyId: string;
  displayName: string;
  accountId: string;
  currencyCode?: string;
  timezone?: string;
}

export interface GoogleAnalyticsRepositoryLike {
  listProperties(userId: number, accessToken: string): Promise<GoogleAnalyticsPropertyLike[]>;
  getProperty(userId: number, accessToken: string, propertyId: string): Promise<GoogleAnalyticsPropertyLike | null>;
  runReport(userId: number, accessToken: string, propertyId: string, request: GoogleAnalyticsReportInput): Promise<{ rows: Array<Record<string, unknown>>; totals?: Array<Record<string, unknown>>; metadata?: Record<string, unknown> }>;
}

export interface GoogleAnalyticsCacheLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

export interface GoogleAnalyticsServiceDependencies {
  repository: GoogleAnalyticsRepositoryLike;
  cache?: GoogleAnalyticsCacheLike;
  validator?: GoogleAnalyticsValidator;
  mapper?: GoogleAnalyticsMapper;
  tokenProvider?: (userId: number) => Promise<string>;
}

export class GoogleAnalyticsService {
  constructor(private readonly deps: GoogleAnalyticsServiceDependencies) {
    this.deps.cache ??= new InMemoryGoogleAnalyticsCache();
    this.deps.validator ??= new GoogleAnalyticsValidator();
    this.deps.mapper ??= new GoogleAnalyticsMapper();
    this.deps.tokenProvider ??= async () => '';
  }

  async listProperties(userId: number): Promise<GoogleAnalyticsPropertyLike[]> {
    const cacheKey = `ga4:properties:${userId}`;
    const cached = this.deps.cache?.get<GoogleAnalyticsPropertyLike[]>(cacheKey);
    if (cached) return cached;

    const accessToken = await this.deps.tokenProvider!(userId);
    const validated = this.deps.validator!.validateAccessToken(accessToken);
    const properties = await this.deps.repository.listProperties(userId, validated);
    this.deps.cache?.set(cacheKey, properties, 5 * 60 * 1000);
    logger.info('Listed GA4 properties', { userId, count: properties.length });
    return properties;
  }

  async propertyDetails(userId: number, propertyId: string): Promise<GoogleAnalyticsPropertyLike | null> {
    const cacheKey = `ga4:property:${userId}:${propertyId}`;
    const cached = this.deps.cache?.get<GoogleAnalyticsPropertyLike | null>(cacheKey);
    if (cached !== undefined) return cached;

    const accessToken = await this.deps.tokenProvider!(userId);
    const validated = this.deps.validator!.validateAccessToken(accessToken);
    const property = await this.deps.repository.getProperty(userId, validated, propertyId);
    this.deps.cache?.set(cacheKey, property, 10 * 60 * 1000);
    return property;
  }

  async users(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'users', 'users');
  }

  async newUsers(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'newUsers', 'newUsers');
  }

  async activeUsers(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'activeUsers', 'activeUsers');
  }

  async sessions(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions');
  }

  async engagedSessions(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'engagedSessions', 'engagedSessions');
  }

  async engagementRate(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'engagementRate', 'engagementRate');
  }

  async averageEngagementTime(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'averageEngagementTime', 'averageEngagementTime');
  }

  async screenPageViews(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'screenPageViews', 'screenPageViews');
  }

  async landingPages(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'screenPageViews', 'screenPageViews', ['pagePath']);
  }

  async exitPages(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'exits', 'exits', ['pagePath']);
  }

  async trafficSources(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['sessionSource', 'sessionMedium']);
  }

  async sourceMedium(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['sessionSource', 'sessionMedium']);
  }

  async defaultChannelGroup(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['defaultChannelGroup']);
  }

  async campaigns(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['campaignName']);
  }

  async countries(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['country']);
  }

  async cities(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['city']);
  }

  async devices(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['deviceCategory']);
  }

  async browsers(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['browser']);
  }

  async operatingSystems(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'sessions', 'sessions', ['operatingSystem']);
  }

  async events(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'eventCount', 'eventCount', ['eventName']);
  }

  async topEvents(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'eventCount', 'eventCount', ['eventName']);
  }

  async keyEvents(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'eventCount', 'eventCount', ['eventName']);
  }

  async conversions(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'conversions', 'conversions', ['eventName']);
  }

  async revenue(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'revenue', 'revenue', ['eventName']);
  }

  async ecommerce(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'transactionRevenue', 'transactionRevenue', ['transactionId']);
  }

  async realtime(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, 'activeUsers', 'activeUsers');
  }

  async dateComparison(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsComparisonResult> {
    const request = this.deps.validator!.validateReport(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const validated = this.deps.validator!.validateAccessToken(accessToken);
    const current = await this.deps.repository.runReport(userId, validated, propertyId, request);
    const previous = await this.deps.repository.runReport(userId, validated, propertyId, {
      ...request,
      startDate: request.comparisonStartDate ?? request.startDate,
      endDate: request.comparisonEndDate ?? request.endDate,
    });
    const currentSummary = this.deps.mapper!.mapSummary(current.totals, request.metrics ?? ['sessions']);
    const previousSummary = this.deps.mapper!.mapSummary(previous.totals, request.metrics ?? ['sessions']);
    const delta = Object.fromEntries(Object.keys(currentSummary).map((key) => [key, (currentSummary[key] ?? 0) - (previousSummary[key] ?? 0)]));
    return { current: currentSummary, previous: previousSummary, delta };
  }

  async customReport(userId: number, propertyId: string, input: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    return this.runMetricReport(userId, propertyId, input, input.metrics?.[0] ?? 'sessions', input.metrics?.[0] ?? 'sessions', input.dimensions);
  }

  private async runMetricReport(
    userId: number,
    propertyId: string,
    input: GoogleAnalyticsReportInput,
    defaultMetric: string,
    metricName: string,
    dimensions: string[] = []
  ): Promise<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>> {
    const request = this.deps.validator!.validateReport(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const validated = this.deps.validator!.validateAccessToken(accessToken);
    const cacheKey = this.buildCacheKey('report', userId, propertyId, request, dimensions, metricName);
    const cached = this.deps.cache?.get<GoogleAnalyticsPaginatedResult<GoogleAnalyticsRow>>(cacheKey);
    if (cached) return cached;

    const data = await this.deps.repository.runReport(userId, validated, propertyId, {
      ...request,
      dimensions: request.dimensions ?? dimensions,
      metrics: request.metrics ?? [metricName],
    });
    const rows = this.deps.mapper!.mapRows(data.rows, { dimensions: request.dimensions ?? dimensions, metrics: request.metrics ?? [metricName] });
    const summary = this.deps.mapper!.mapSummary(data.totals, request.metrics ?? [metricName]);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary,
    };
    this.deps.cache?.set(cacheKey, result, 60 * 1000);
    logger.info('Generated GA4 report', { userId, propertyId, metric: metricName, count: rows.length });
    return result;
  }

  private paginate<T>(rows: T[], page: number, limit: number): { rows: T[] } {
    const start = (page - 1) * limit;
    return { rows: rows.slice(start, start + limit) };
  }

  private buildCacheKey(method: string, userId: number, propertyId: string, request: GoogleAnalyticsReportInput, dimensions: string[], metricName: string) {
    return `${method}:${userId}:${propertyId}:${metricName}:${JSON.stringify({ ...request, dimensions })}`;
  }
}

export const googleAnalyticsService = new GoogleAnalyticsService({
  repository: {} as GoogleAnalyticsRepositoryLike,
  cache: new InMemoryGoogleAnalyticsCache(),
  validator: new GoogleAnalyticsValidator(),
  mapper: new GoogleAnalyticsMapper(),
});
