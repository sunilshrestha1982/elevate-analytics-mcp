import { createChildLogger } from '../lib/logger.js';
import { incrementGoogleApiQuota, observeGoogleApiLatency } from '../lib/metrics.js';
import type { SearchConsoleQueryInput } from '../services/searchConsoleValidator.js';
import { traceAsync } from '../lib/tracing.js';

const logger = createChildLogger({ scope: 'search-console-repository' });

export interface SearchConsoleAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class SearchConsoleRepository {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async listSites(userId: number, accessToken: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
    try {
      return await traceAsync('google-api', 'search_console.list_sites', { userId }, async () => {
      const startedAt = Date.now();
      const response = await this.fetcher('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const durationMs = Date.now() - startedAt;
      observeGoogleApiLatency('search_console', 'listSites', response.status, durationMs);
      logger.info('Search Console request performance', { userId, operation: 'listSites', googleApiLatencyMs: durationMs, statusCode: response.status });
      if (!response.ok) {
        if (response.status === 429) {
          incrementGoogleApiQuota('search_console', 'listSites');
          logger.warn('Search Console quota usage event', { operation: 'listSites', statusCode: response.status });
        }
        throw new Error(`Search Console sites request failed: ${response.status}`);
      }
      const data = (await response.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> };
      return (data.siteEntry ?? []).map((site) => ({ siteUrl: site.siteUrl, permissionLevel: site.permissionLevel }));
      });
    } catch (error) {
      logger.error('Search Console sites lookup failed', { userId, error });
      throw error;
    }
  }

  async queryAnalytics(userId: number, accessToken: string, request: SearchConsoleQueryInput): Promise<{ rows: SearchConsoleAnalyticsRow[]; totals: { clicks: number; impressions: number; ctr: number; position: number } }> {
    try {
      return await traceAsync('google-api', 'search_console.query_analytics', { userId }, async () => {
      const url = new URL('https://www.googleapis.com/webmasters/v3/sites/https://example.com/searchAnalytics/query');
      url.searchParams.set('startDate', request.startDate);
      url.searchParams.set('endDate', request.endDate);
      if (request.country) url.searchParams.set('country', request.country);
      if (request.device) url.searchParams.set('device', request.device);
      if (request.searchType) url.searchParams.set('searchType', request.searchType);
      if (request.sort) url.searchParams.set('sort', request.sort);
      const startedAt = Date.now();
      const response = await this.fetcher(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: request.startDate, endDate: request.endDate, dimensions: ['query'] }),
      });
      const durationMs = Date.now() - startedAt;
      observeGoogleApiLatency('search_console', 'queryAnalytics', response.status, durationMs);
      logger.info('Search Console request performance', { userId, operation: 'queryAnalytics', googleApiLatencyMs: durationMs, statusCode: response.status });
      if (!response.ok) {
        if (response.status === 429) {
          incrementGoogleApiQuota('search_console', 'queryAnalytics');
          logger.warn('Search Console quota usage event', { operation: 'queryAnalytics', statusCode: response.status });
        }
        throw new Error(`Search Console analytics request failed: ${response.status}`);
      }
      const data = (await response.json()) as { rows?: SearchConsoleAnalyticsRow[]; totals?: { clicks: number; impressions: number; ctr: number; position: number } };
      return {
        rows: data.rows ?? [],
        totals: data.totals ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      };
      });
    } catch (error) {
      logger.error('Search Console analytics lookup failed', { userId, request, error });
      throw error;
    }
  }
}
