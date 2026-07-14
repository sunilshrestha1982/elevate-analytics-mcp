import { createChildLogger } from '../lib/logger.js';
import { incrementGoogleApiQuota, observeGoogleApiLatency } from '../lib/metrics.js';
import type { PageSpeedRequestInput } from '../services/pageSpeedValidator.js';
import { traceAsync } from '../lib/tracing.js';

const logger = createChildLogger({ scope: 'pagespeed-repository' });

export interface PageSpeedReport {
  id: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  lighthouseResult: Record<string, any>;
  loadingExperience?: Record<string, any>;
  originLoadingExperience?: Record<string, any>;
  analysisUTCTimestamp?: string;
}

export class PageSpeedRepository {
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly apiKey = process.env.GOOGLE_API_KEY ?? '') {}

  async analyzeUrl(userId: number, url: string, request: PageSpeedRequestInput): Promise<PageSpeedReport> {
    return this.withRetry(async () => traceAsync('google-api', 'pagespeed.analyze_url', { userId, url, strategy: request.strategy }, async () => {
      try {
        const query = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
        query.searchParams.set('url', url);
        query.searchParams.set('strategy', request.strategy);
        if (this.apiKey) {
          query.searchParams.set('key', this.apiKey);
        }

        const startedAt = Date.now();
        const response = await this.fetcher(query.toString(), { headers: { Accept: 'application/json' } });
        const durationMs = Date.now() - startedAt;
        observeGoogleApiLatency('pagespeed', 'analyzeUrl', response.status, durationMs);
        logger.info('PageSpeed request performance', { userId, url, strategy: request.strategy, durationMs, statusCode: response.status });
        if (!response.ok) {
          await this.handleErrorResponse(response);
        }
        const data = (await response.json()) as PageSpeedReport;
        return this.validateResponse(data);
      } catch (error) {
        logger.error('PageSpeed analysis failed', { userId, url, error });
        throw error;
      }
    }), { userId, url, strategy: request.strategy });
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
        logger.warn('Retrying PageSpeed request', { ...context, attempt: attempt + 1, delayMs, message });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt += 1;
      }
    }
    throw lastError;
  }

  private async handleErrorResponse(response: Response) {
    const bodyText = await response.text();
    if (response.status === 429 || /quota/i.test(bodyText)) {
      incrementGoogleApiQuota('pagespeed', 'analyzeUrl');
      logger.warn('PageSpeed quota usage event', { statusCode: response.status });
      throw new Error(`PageSpeed quota exceeded: ${response.status}`);
    }
    if (response.status >= 500 || response.status === 429) {
      throw new Error(`PageSpeed transient failure: ${response.status}`);
    }
    throw new Error(`PageSpeed request failed: ${response.status}`);
  }

  private validateResponse(data: PageSpeedReport): PageSpeedReport {
    if (!data || typeof data !== 'object') {
      throw new Error('PageSpeed response validation failed');
    }
    if (!data.id || !data.url || !data.lighthouseResult) {
      throw new Error('PageSpeed response validation failed: missing required fields');
    }
    return data;
  }
}
