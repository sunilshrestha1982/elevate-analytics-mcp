import { logger } from '../lib/logger.js';
import type { PageSpeedReport } from '../repositories/pageSpeedRepository.js';
import { PageSpeedValidator, type PageSpeedRequestInput } from './pageSpeedValidator.js';
import { RedisPageSpeedCache } from './pageSpeedCache.js';
import { TechnicalSEOAnalyzer } from './technicalSeoAnalyzer.js';
import { CoreWebVitalsAnalyzer } from './coreWebVitalsAnalyzer.js';
import { PerformanceAnalyzer } from './performanceAnalyzer.js';

export interface PageSpeedRecommendation {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  reason: string;
  estimatedImpact: string;
  estimatedImplementationEffort: string;
  suggestedFix: string;
  referenceUrl: string;
}

export interface PageSpeedScorecard {
  technicalSeoScore: number;
  performanceScore: number;
  coreWebVitalsScore: number;
  accessibilityScore: number;
  overallSiteHealthScore: number;
}

export interface PageSpeedAnalysisResult {
  id: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  scorecard: PageSpeedScorecard;
  metrics: Record<string, unknown>;
  recommendations: PageSpeedRecommendation[];
  opportunities: Array<Record<string, unknown>>;
}

export interface PageSpeedRepositoryLike {
  analyzeUrl(userId: number, url: string, request: PageSpeedRequestInput): Promise<PageSpeedReport>;
}

export interface PageSpeedCacheLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

export interface PageSpeedServiceDependencies {
  repository: PageSpeedRepositoryLike;
  cache?: PageSpeedCacheLike;
  validator?: PageSpeedValidator;
  technicalAnalyzer?: TechnicalSEOAnalyzer;
  coreWebVitalsAnalyzer?: CoreWebVitalsAnalyzer;
  performanceAnalyzer?: PerformanceAnalyzer;
}

export class PageSpeedService {
  constructor(private readonly deps: PageSpeedServiceDependencies) {
    this.deps.cache ??= new RedisPageSpeedCache();
    this.deps.validator ??= new PageSpeedValidator();
    this.deps.technicalAnalyzer ??= new TechnicalSEOAnalyzer();
    this.deps.coreWebVitalsAnalyzer ??= new CoreWebVitalsAnalyzer();
    this.deps.performanceAnalyzer ??= new PerformanceAnalyzer();
  }

  async analyzeUrl(userId: number, url: string, input: Partial<PageSpeedRequestInput> = {}): Promise<PageSpeedAnalysisResult> {
    const request = this.deps.validator!.validateRequest({ url, strategy: input.strategy ?? 'mobile' });
    const cacheKey = `pagespeed:${userId}:${request.strategy}:${url}`;
    const cached = this.deps.cache?.get<PageSpeedAnalysisResult>(cacheKey);
    if (cached) return cached;

    const report = await this.deps.repository.analyzeUrl(userId, url, request);
    const scorecard = this.deps.technicalAnalyzer!.analyze(report);
    const coreWebVitals = this.deps.coreWebVitalsAnalyzer!.analyze(report);
    const performance = this.deps.performanceAnalyzer!.analyze(report);
    const result: PageSpeedAnalysisResult = {
      id: report.id,
      url: report.url,
      strategy: request.strategy,
      scorecard,
      metrics: { ...coreWebVitals.metrics, ...performance.metrics },
      recommendations: scorecard.technicalSeoScore < 80 ? this.buildRecommendations(report, scorecard) : [],
      opportunities: performance.opportunities,
    };
    this.deps.cache?.set(cacheKey, result, 5 * 60 * 1000);
    logger.info('Analyzed PageSpeed report', { userId, url, strategy: request.strategy });
    return result;
  }

  async mobileReport(userId: number, url: string): Promise<PageSpeedAnalysisResult> {
    return this.analyzeUrl(userId, url, { strategy: 'mobile' });
  }

  async desktopReport(userId: number, url: string): Promise<PageSpeedAnalysisResult> {
    return this.analyzeUrl(userId, url, { strategy: 'desktop' });
  }

  async coreWebVitals(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return report.metrics;
  }

  async performanceMetrics(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return report.metrics;
  }

  async accessibility(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { score: report.scorecard.accessibilityScore };
  }

  async bestPractices(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { score: report.scorecard.performanceScore };
  }

  async seoScore(userId: number, url: string): Promise<number> {
    const report = await this.analyzeUrl(userId, url);
    return report.scorecard.technicalSeoScore;
  }

  async technicalSeoScore(userId: number, url: string): Promise<number> {
    return this.seoScore(userId, url);
  }

  async performanceOpportunities(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities;
  }

  async resourceOptimization(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => ['unused-css', 'unused-javascript', 'image-optimization'].includes(String(item.category)));
  }

  async renderBlockingResources(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'render-blocking-resources');
  }

  async unusedCSS(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'unused-css');
  }

  async unusedJavaScript(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'unused-javascript');
  }

  async imageOptimization(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'image-optimization');
  }

  async fontOptimization(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'font-optimization');
  }

  async cacheOptimization(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'cache-optimization');
  }

  async compression(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'compression');
  }

  async criticalRequests(userId: number, url: string): Promise<Array<Record<string, unknown>>> {
    const report = await this.analyzeUrl(userId, url);
    return report.opportunities.filter((item) => String(item.category) === 'critical-requests');
  }

  async serverResponseTime(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: Number(report.metrics.serverResponseTime ?? 0) };
  }

  async largestContentfulPaint(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: report.metrics.largestContentfulPaint };
  }

  async interactionToNextPaint(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: report.metrics.interactionToNextPaint };
  }

  async cumulativeLayoutShift(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: report.metrics.cumulativeLayoutShift };
  }

  async firstContentfulPaint(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: report.metrics.firstContentfulPaint };
  }

  async speedIndex(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: report.metrics.speedIndex };
  }

  async timeToInteractive(userId: number, url: string): Promise<Record<string, unknown>> {
    const report = await this.analyzeUrl(userId, url);
    return { value: report.metrics.timeToInteractive };
  }

  private buildRecommendations(report: PageSpeedReport, scorecard: PageSpeedScorecard): PageSpeedRecommendation[] {
    const recommendations: PageSpeedRecommendation[] = [];
    if (scorecard.performanceScore < 70) {
      recommendations.push({
        title: 'Reduce render-blocking resources',
        priority: 'high',
        category: 'performance',
        reason: 'Render-blocking resources slow the first render and degrade the user experience.',
        estimatedImpact: 'High',
        estimatedImplementationEffort: 'Medium',
        suggestedFix: 'Defer non-critical scripts and inline critical CSS.',
        referenceUrl: 'https://web.dev/render-blocking-resources/',
      });
    }
    if (scorecard.coreWebVitalsScore < 75) {
      recommendations.push({
        title: 'Improve Core Web Vitals',
        priority: 'high',
        category: 'core-web-vitals',
        reason: 'Core Web Vitals are below the recommended range and can hurt rankings and engagement.',
        estimatedImpact: 'High',
        estimatedImplementationEffort: 'Medium',
        suggestedFix: 'Optimize LCP, INP, and CLS by pruning large assets and improving layout stability.',
        referenceUrl: 'https://web.dev/vitals/',
      });
    }
    if (scorecard.accessibilityScore < 80) {
      recommendations.push({
        title: 'Improve accessibility',
        priority: 'medium',
        category: 'accessibility',
        reason: 'Accessibility issues can reduce usability and increase abandonment.',
        estimatedImpact: 'Medium',
        estimatedImplementationEffort: 'Low',
        suggestedFix: 'Add appropriate labels, improve contrast, and fix heading structure.',
        referenceUrl: 'https://web.dev/accessibility/',
      });
    }
    return recommendations;
  }
}

export const pageSpeedService = new PageSpeedService({
  repository: {} as PageSpeedRepositoryLike,
  cache: new RedisPageSpeedCache(),
  validator: new PageSpeedValidator(),
});
