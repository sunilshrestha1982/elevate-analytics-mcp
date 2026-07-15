import { createChildLogger } from '../lib/logger.js';
import { incrementGoogleApiQuota, observeGoogleApiLatency } from '../lib/metrics.js';
import type { GoogleAnalyticsReportInput } from '../services/googleAnalyticsValidator.js';
import { traceAsync } from '../lib/tracing.js';

const logger = createChildLogger({ scope: 'ga4-repository' });

export interface GoogleAnalyticsProperty {
  propertyId: string;
  displayName: string;
  accountId: string;
  currencyCode?: string;
  timezone?: string;
}

export interface GoogleAnalyticsReportResponse {
  rows: Array<Record<string, unknown>>;
  totals?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export class GoogleAnalyticsRepository {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async listProperties(userId: number, accessToken: string): Promise<GoogleAnalyticsProperty[]> {
    return this.withRetry(async () => traceAsync('google-api', 'ga4.list_properties', { userId }, async () => {
      try {
        const startedAt = Date.now();
        const response = await this.fetcher('https://analyticsdata.googleapis.com/v1beta/properties', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const durationMs = Date.now() - startedAt;
        observeGoogleApiLatency('ga4', 'listProperties', response.status, durationMs);
        logger.info('GA4 request performance', { userId, operation: 'listProperties', googleApiLatencyMs: durationMs, statusCode: response.status });
        if (!response.ok) {
          await this.handleErrorResponse(response, 'properties');
        }
        const data = (await response.json()) as { properties?: GoogleAnalyticsProperty[] };
        return this.validateProperties(data);
      } catch (error) {
        logger.error('GA4 properties lookup failed', { userId, error });
        throw error;
      }
    }), { userId, operation: 'listProperties' });
  }

  async getProperty(userId: number, accessToken: string, propertyId: string): Promise<GoogleAnalyticsProperty | null> {
    return this.withRetry(async () => traceAsync('google-api', 'ga4.get_property', { userId, propertyId }, async () => {
      try {
        const startedAt = Date.now();
        const response = await this.fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const durationMs = Date.now() - startedAt;
        observeGoogleApiLatency('ga4', 'getProperty', response.status, durationMs);
        logger.info('GA4 request performance', { userId, propertyId, operation: 'getProperty', googleApiLatencyMs: durationMs, statusCode: response.status });
        if (!response.ok) {
          await this.handleErrorResponse(response, 'property');
        }
        const data = (await response.json()) as { property?: GoogleAnalyticsProperty };
        return this.validateProperty(data);
      } catch (error) {
        logger.error('GA4 property lookup failed', { userId, propertyId, error });
        throw error;
      }
    }), { userId, propertyId, operation: 'getProperty' });
  }

  async runReport(userId: number, accessToken: string, propertyId: string, request: GoogleAnalyticsReportInput): Promise<GoogleAnalyticsReportResponse> {
    return this.withRetry(async () => traceAsync('google-api', 'ga4.run_report', { userId, propertyId }, async () => {
      try {
        const startedAt = Date.now();
        const response = await this.fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dimensions: (request.dimensions ?? []).map((dimension) => ({ name: dimension })),
            metrics: (request.metrics ?? []).map((metric) => ({ name: metric })),
            dateRanges: [{ startDate: request.startDate, endDate: request.endDate }],
            orderBys: request.sort ? [{ desc: true, metric: { metricName: request.sort } }] : undefined,
          }),
        });
        const durationMs = Date.now() - startedAt;
        observeGoogleApiLatency('ga4', 'runReport', response.status, durationMs);
        logger.info('GA4 request performance', { userId, propertyId, operation: 'runReport', googleApiLatencyMs: durationMs, statusCode: response.status });
        if (!response.ok) {
          await this.handleErrorResponse(response, 'report');
        }
        const data = (await response.json()) as { rows?: Array<Record<string, unknown>>; totals?: Array<Record<string, unknown>>; metadata?: Record<string, unknown> };
        return this.validateReport(data);
      } catch (error) {
        logger.error('GA4 report lookup failed', { userId, propertyId, request, error });
        throw error;
      }
    }), { userId, propertyId, operation: 'runReport' });
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
        const shouldRetry = /429|500|502|503|504|quota|temporar/i.test(message);
        if (!shouldRetry || attempt === 2) break;
        const delayMs = 1000 * 2 ** attempt + Math.floor(Math.random() * 250);
        logger.warn('Retrying GA4 request after transient failure', { ...context, attempt: attempt + 1, delayMs, message });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt += 1;
      }
    }
    throw lastError;
  }

  private async handleErrorResponse(response: Response, context: string) {
    const bodyText = await response.text();
    if (response.status === 429 || /quota/i.test(bodyText)) {
      incrementGoogleApiQuota('ga4', context);
      logger.warn('GA4 quota usage event', { context, statusCode: response.status });
      throw new Error(`GA4 quota exceeded for ${context}: ${response.status}`);
    }
    if (response.status >= 500 || response.status === 429) {
      throw new Error(`GA4 transient failure for ${context}: ${response.status}`);
    }
    throw new Error(`GA4 request failed for ${context}: ${response.status}`);
  }

  private validateProperties(data: { properties?: GoogleAnalyticsProperty[] }): GoogleAnalyticsProperty[] {
    if (!Array.isArray(data.properties)) {
      throw new Error('GA4 response validation failed: properties must be an array');
    }
    return data.properties;
  }

  private validateProperty(data: { property?: GoogleAnalyticsProperty }): GoogleAnalyticsProperty | null {
    if (data.property && typeof data.property !== 'object') {
      throw new Error('GA4 response validation failed: property must be an object');
    }
    return data.property ?? null;
  }

  private validateReport(data: { rows?: Array<Record<string, unknown>>; totals?: Array<Record<string, unknown>>; metadata?: Record<string, unknown> }): GoogleAnalyticsReportResponse {
    if (!Array.isArray(data.rows)) {
      throw new Error('GA4 response validation failed: rows must be an array');
    }
    if (data.totals !== undefined && !Array.isArray(data.totals)) {
      throw new Error('GA4 response validation failed: totals must be an array');
    }
    if (data.metadata !== undefined && (typeof data.metadata !== 'object' || data.metadata === null)) {
      throw new Error('GA4 response validation failed: metadata must be an object');
    }
    return { rows: data.rows, totals: data.totals ?? [], metadata: data.metadata ?? {} };
  }
}
