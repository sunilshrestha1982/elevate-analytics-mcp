import { logger } from '../lib/logger.js';
import { SearchConsoleValidator, type SearchConsoleQueryInput } from './searchConsoleValidator.js';
import { SearchConsoleMapper } from './searchConsoleMapper.js';
import { RedisSearchConsoleCache } from './searchConsoleCache.js';

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface SearchConsoleRow {
  query: string;
  page: string;
  country: string;
  device: string;
  searchAppearance: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSummary {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsolePaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  summary: SearchConsoleSummary;
}

export interface SearchConsoleComparisonResult {
  current: SearchConsoleSummary;
  previous: SearchConsoleSummary;
  deltaClicks: number;
  deltaImpressions: number;
  deltaCtr: number;
  deltaPosition: number;
}

export interface SearchConsoleRepositoryLike {
  listSites(userId: number, accessToken: string): Promise<SearchConsoleSite[]>;
  queryAnalytics(userId: number, accessToken: string, request: SearchConsoleQueryInput): Promise<{ rows: Array<Record<string, unknown>>; totals: SearchConsoleSummary }>;
}

export interface SearchConsoleCacheLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

export interface SearchConsoleServiceDependencies {
  repository: SearchConsoleRepositoryLike;
  cache?: SearchConsoleCacheLike;
  validator?: SearchConsoleValidator;
  mapper?: SearchConsoleMapper;
  tokenProvider?: (userId: number) => Promise<string>;
}

export class SearchConsoleService {
  constructor(private readonly deps: SearchConsoleServiceDependencies) {
    this.deps.cache ??= new RedisSearchConsoleCache();
    this.deps.validator ??= new SearchConsoleValidator();
    this.deps.mapper ??= new SearchConsoleMapper();
    this.deps.tokenProvider ??= async () => '';
  }

  async listSites(userId: number): Promise<SearchConsoleSite[]> {
    const cacheKey = `search-console:sites:${userId}`;
    const cached = this.deps.cache?.get<SearchConsoleSite[]>(cacheKey);
    if (cached) return cached;

    const accessToken = await this.deps.tokenProvider!(userId);
    const validated = this.deps.validator!.validateAccessToken(accessToken);
    const sites = await this.deps.repository.listSites(userId, validated);
    this.deps.cache?.set(cacheKey, sites, 5 * 60 * 1000);
    logger.info('Listed Search Console sites', { userId, count: sites.length });
    return sites;
  }

  async topQueries(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('topQueries', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async topPages(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('topPages', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'page');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async pagePerformance(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('pagePerformance', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'page');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async queryPerformance(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('queryPerformance', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async countryReport(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('countryReport', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'country');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async deviceReport(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('deviceReport', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'device');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async searchAppearance(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('searchAppearance', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'searchAppearance');
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async compareDateRanges(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsoleComparisonResult> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('compareDateRanges', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsoleComparisonResult>(key);
    if (cached) return cached;

    const current = await this.deps.repository.queryAnalytics(userId, accessToken, {
      ...request,
      startDate: request.startDate,
      endDate: request.endDate,
    });
    const previous = await this.deps.repository.queryAnalytics(userId, accessToken, {
      ...request,
      startDate: request.comparisonStartDate ?? request.startDate,
      endDate: request.comparisonEndDate ?? request.endDate,
    });
    const comparison: SearchConsoleComparisonResult = {
      current: current.totals,
      previous: previous.totals,
      deltaClicks: current.totals.clicks - previous.totals.clicks,
      deltaImpressions: current.totals.impressions - previous.totals.impressions,
      deltaCtr: current.totals.ctr - previous.totals.ctr,
      deltaPosition: current.totals.position - previous.totals.position,
    };
    this.deps.cache?.set(key, comparison, 60 * 1000);
    return comparison;
  }

  async brandQueries(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('brandQueries', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query').filter((row) => this.matchesBrand(row.query, request.regex?.query));
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async nonBrandQueries(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('nonBrandQueries', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query').filter((row) => !this.matchesBrand(row.query, request.regex?.query));
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async lowCTRPages(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('lowCTRPages', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'page').filter((row) => row.ctr < 0.05);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async rankingOpportunities(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('rankingOpportunities', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query').filter((row) => row.position > 10);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async decliningPages(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('decliningPages', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'page').filter((row) => row.position > 20);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async risingPages(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('risingPages', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'page').filter((row) => row.position < 5);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async newKeywords(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('newKeywords', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query').filter((row) => row.impressions > 0 && row.clicks === 0);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  async lostKeywords(userId: number, siteUrl: string, input: SearchConsoleQueryInput): Promise<SearchConsolePaginatedResult<SearchConsoleRow>> {
    const request = this.deps.validator!.validateRequest(input);
    const accessToken = await this.deps.tokenProvider!(userId);
    const key = this.buildCacheKey('lostKeywords', userId, siteUrl, request);
    const cached = this.deps.cache?.get<SearchConsolePaginatedResult<SearchConsoleRow>>(key);
    if (cached) return cached;

    const data = await this.deps.repository.queryAnalytics(userId, accessToken, request);
    const rows = this.deps.mapper!.mapRows(data.rows, request, 'query').filter((row) => row.clicks === 0 && row.impressions === 0);
    const paged = this.paginate(rows, request.page ?? 1, request.limit ?? 10);
    const result = {
      rows: paged.rows,
      total: rows.length,
      page: request.page ?? 1,
      limit: request.limit ?? 10,
      summary: data.totals,
    };
    this.deps.cache?.set(key, result, 60 * 1000);
    return result;
  }

  private paginate<T>(rows: T[], page: number, limit: number): { rows: T[] } {
    const start = (page - 1) * limit;
    return { rows: rows.slice(start, start + limit) };
  }

  private buildCacheKey(method: string, userId: number, siteUrl: string, request: SearchConsoleQueryInput) {
    return `${method}:${userId}:${siteUrl}:${JSON.stringify(request)}`;
  }

  private matchesBrand(query: string, brandPattern?: string) {
    if (!brandPattern) return true;
    try {
      return new RegExp(brandPattern, 'i').test(query);
    } catch {
      return false;
    }
  }
}

export const searchConsoleService = new SearchConsoleService({
  repository: {} as SearchConsoleRepositoryLike,
  cache: new RedisSearchConsoleCache(),
  validator: new SearchConsoleValidator(),
  mapper: new SearchConsoleMapper(),
});
