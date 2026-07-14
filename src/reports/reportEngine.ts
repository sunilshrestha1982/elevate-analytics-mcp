import { logger } from '../lib/logger.js';
import { googleAnalyticsService } from '../services/googleAnalyticsService.js';
import { pageSpeedService } from '../services/pageSpeedService.js';
import { searchConsoleService } from '../services/searchConsoleService.js';
import { seoInsightService } from '../services/seoInsightService.js';
import { ActionPlanGenerator } from './actionPlanGenerator.js';
import { ExecutiveSummaryService } from './executiveSummaryService.js';
import { ForecastEngine } from './forecastEngine.js';
import { InsightGenerator } from './insightGenerator.js';
import { NarrativeBuilder } from './narrativeBuilder.js';
import { InMemoryReportCache, type ReportCache } from './reportCache.js';
import { DefaultReportRepository, type ReportRepository } from './reportRepository.js';
import { RecommendationGenerator } from './recommendationGenerator.js';
import { ReportValidator } from './reportValidator.js';
import { TrendAnalyzer } from './trendAnalyzer.js';
import type { GeneratedReport, ReportFormat, ReportRequest, ReportType } from './types.js';

const REPORT_TITLE_MAP: Record<ReportType, string> = {
  'weekly-seo-report': 'Weekly SEO Report',
  'monthly-seo-report': 'Monthly SEO Report',
  'quarterly-seo-report': 'Quarterly SEO Report',
  'technical-seo-audit': 'Technical SEO Audit',
  'content-audit': 'Content Audit',
  'landing-page-audit': 'Landing Page Audit',
  'keyword-opportunity-report': 'Keyword Opportunity Report',
  'traffic-loss-report': 'Traffic Loss Report',
  'traffic-growth-report': 'Traffic Growth Report',
  'website-health-report': 'Website Health Report',
  'competitor-comparison': 'Competitor Comparison (Framework Only)',
  'executive-dashboard': 'Executive Dashboard',
};

export interface ReportEngineDependencies {
  validator?: ReportValidator;
  cache?: ReportCache;
  repository?: ReportRepository;
  executiveSummaryService?: ExecutiveSummaryService;
  insightGenerator?: InsightGenerator;
  recommendationGenerator?: RecommendationGenerator;
  trendAnalyzer?: TrendAnalyzer;
  forecastEngine?: ForecastEngine;
  narrativeBuilder?: NarrativeBuilder;
  actionPlanGenerator?: ActionPlanGenerator;
}

export class ReportEngine {
  private readonly validator: ReportValidator;
  private readonly cache: ReportCache;
  private readonly repository: ReportRepository;
  private readonly executiveSummaryService: ExecutiveSummaryService;
  private readonly insightGenerator: InsightGenerator;
  private readonly recommendationGenerator: RecommendationGenerator;
  private readonly trendAnalyzer: TrendAnalyzer;
  private readonly forecastEngine: ForecastEngine;
  private readonly narrativeBuilder: NarrativeBuilder;
  private readonly actionPlanGenerator: ActionPlanGenerator;

  constructor(deps: ReportEngineDependencies = {}) {
    this.validator = deps.validator ?? new ReportValidator();
    this.cache = deps.cache ?? new InMemoryReportCache();
    this.repository =
      deps.repository ??
      new DefaultReportRepository({
        searchConsoleService,
        googleAnalyticsService,
        pageSpeedService,
        seoInsightService,
      });
    this.executiveSummaryService = deps.executiveSummaryService ?? new ExecutiveSummaryService();
    this.insightGenerator = deps.insightGenerator ?? new InsightGenerator();
    this.recommendationGenerator = deps.recommendationGenerator ?? new RecommendationGenerator();
    this.trendAnalyzer = deps.trendAnalyzer ?? new TrendAnalyzer();
    this.forecastEngine = deps.forecastEngine ?? new ForecastEngine();
    this.narrativeBuilder = deps.narrativeBuilder ?? new NarrativeBuilder();
    this.actionPlanGenerator = deps.actionPlanGenerator ?? new ActionPlanGenerator();
  }

  async generate(request: ReportRequest, format: ReportFormat = 'json'): Promise<{ format: ReportFormat; content: string; report: GeneratedReport }> {
    const validated = this.validator.validate(request);
    const cacheKey = this.buildCacheKey(validated);
    const cached = this.cache.get<GeneratedReport>(cacheKey);
    if (cached) {
      logger.info('Report served from cache', { reportType: validated.reportType, userId: validated.userId });
      return { format, content: this.formatContent(cached, format), report: cached };
    }

    const snapshot = await this.repository.fetchSnapshot(validated);
    const scores = this.executiveSummaryService.buildScores(snapshot);
    const executiveSummary = this.executiveSummaryService.buildExecutiveSummary(validated, snapshot, scores);
    const keyMetrics = this.executiveSummaryService.buildKeyMetrics(snapshot, scores);
    const keyChanges = this.trendAnalyzer.buildKeyChanges(snapshot);
    const insights = this.insightGenerator.generateInsights(validated, snapshot);
    const rootCauseAnalysis = this.insightGenerator.generateRootCauseAnalysis(snapshot);
    const recommendations = this.recommendationGenerator.generateRecommendations(validated, snapshot);
    const priorityMatrix = this.recommendationGenerator.buildPriorityMatrix(recommendations);
    const estimatedImpact = this.recommendationGenerator.summarizeEstimatedImpact(recommendations);
    const estimatedEffort = this.recommendationGenerator.summarizeEstimatedEffort(recommendations);
    const actionPlan = this.actionPlanGenerator.build(recommendations);
    const nextReviewDate = this.actionPlanGenerator.getNextReviewDate(validated.reportType);
    const forecast = this.forecastEngine.project(snapshot);

    const report: GeneratedReport = {
      reportType: validated.reportType,
      title: REPORT_TITLE_MAP[validated.reportType],
      generatedAt: new Date().toISOString(),
      executiveSummary,
      keyMetrics,
      keyChanges,
      insights,
      rootCauseAnalysis,
      recommendations,
      priorityMatrix,
      estimatedImpact,
      estimatedEffort,
      actionPlan,
      nextReviewDate,
      scores,
      forecast,
      output: {
        json: '',
        markdown: '',
        html: '',
      },
    };

    const markdown = this.narrativeBuilder.toMarkdown(report);
    const html = this.narrativeBuilder.toHtml(report);
    const json = JSON.stringify({ ...report, output: undefined }, null, 2);

    report.output = { json, markdown, html };
    this.cache.set(cacheKey, report, 5 * 60 * 1000);
    logger.info('Generated report', { reportType: validated.reportType, userId: validated.userId, format });

    return { format, content: this.formatContent(report, format), report };
  }

  private buildCacheKey(request: ReportRequest): string {
    return `report:${request.userId}:${request.reportType}:${JSON.stringify(request)}`;
  }

  private formatContent(report: GeneratedReport, format: ReportFormat): string {
    if (format === 'markdown') return report.output.markdown;
    if (format === 'html') return report.output.html;
    return report.output.json;
  }
}

export const reportEngine = new ReportEngine();
