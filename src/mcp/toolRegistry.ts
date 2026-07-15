import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchConsoleService } from '../services/searchConsoleService.js';
import { googleAnalyticsService } from '../services/googleAnalyticsService.js';
import { pageSpeedService } from '../services/pageSpeedService.js';
import { seoInsightService } from '../services/seoInsightService.js';
import { reportEngine } from '../reports/reportEngine.js';
import { observeMcpToolExecution } from '../lib/metrics.js';
import type { Logger } from './logger.js';
import { traceAsync } from '../lib/tracing.js';
import { randomUUID } from 'node:crypto';

const requestShape = {
  userId: z.number().int().positive().optional(),
  siteUrl: z.string().url().optional(),
  propertyId: z.string().optional(),
  url: z.string().url().optional(),
  startDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  endDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  comparisonStartDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  comparisonEndDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  reportType: z.enum([
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
  ]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  strategy: z.enum(['mobile', 'desktop']).optional(),
} satisfies Record<string, z.ZodTypeAny>;

type RequestShapeKey = keyof typeof requestShape;

function createInputSchema(...keys: RequestShapeKey[]): Record<string, z.ZodTypeAny> {
  return Object.fromEntries(keys.map((key) => [key, requestShape[key]])) as Record<string, z.ZodTypeAny>;
}

export interface ToolRegistry {
  registerAll(): void;
}

export function createToolRegistry(server: McpServer, logger: Logger): ToolRegistry {
  const register = (name: string, description: string, inputSchema: Record<string, z.ZodTypeAny>, handler: (args: any) => Promise<unknown>) => {
    const tool = server.tool as any;
    tool.call(server, name, description, inputSchema, async (args: Record<string, unknown>) => {
      const start = process.hrtime.bigint();
      try {
        const result = await traceAsync('mcp-tool', `mcp.tool.${name}`, { toolName: name }, async () => handler(args));
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        observeMcpToolExecution(name, 'ok', durationMs);
        logger.info('MCP tool executed', {
          mcpTool: name,
          executionTimeMs: Number(durationMs.toFixed(2)),
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const errorId = randomUUID();
        observeMcpToolExecution(name, 'error', durationMs);
        logger.error(`MCP tool failed: ${name}`, {
          errorId,
          mcpTool: name,
          executionTimeMs: Number(durationMs.toFixed(2)),
          error,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', errorId }, null, 2),
          }],
        };
      }
    });
  };

  return {
    registerAll() {
      register('list_sites', 'List Search Console sites for the authenticated user', createInputSchema('userId'), async (args) => searchConsoleService.listSites(args.userId));
      register('top_queries', 'Get top Search Console queries', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate', 'page', 'limit'), async (args) => searchConsoleService.topQueries(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate, page: args.page, limit: args.limit }));
      register('top_pages', 'Get top Search Console pages', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.topPages(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('page_report', 'Get a page performance report', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.pagePerformance(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('query_report', 'Get a query performance report', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.queryPerformance(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('country_report', 'Get Search Console country performance', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.countryReport(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('device_report', 'Get Search Console device performance', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.deviceReport(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('compare_dates', 'Compare Search Console date ranges', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate', 'comparisonStartDate', 'comparisonEndDate'), async (args) => searchConsoleService.compareDateRanges(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate, comparisonStartDate: args.comparisonStartDate, comparisonEndDate: args.comparisonEndDate }));
      register('low_ctr_pages', 'List low-CTR landing pages', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.lowCTRPages(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('ranking_opportunities', 'List ranking opportunity queries', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.rankingOpportunities(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('declining_pages', 'List declining pages', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.decliningPages(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('rising_pages', 'List rising pages', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.risingPages(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('new_keywords', 'List new keywords', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.newKeywords(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));
      register('lost_keywords', 'List lost keywords', createInputSchema('userId', 'siteUrl', 'startDate', 'endDate'), async (args) => searchConsoleService.lostKeywords(args.userId, args.siteUrl, { startDate: args.startDate, endDate: args.endDate }));

      register('list_properties', 'List Google Analytics properties', createInputSchema('userId'), async (args) => googleAnalyticsService.listProperties(args.userId));
      register('users', 'Get users metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.users(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('sessions', 'Get sessions metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.sessions(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('active_users', 'Get active users metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.activeUsers(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('landing_pages', 'Get landing page metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.landingPages(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('traffic_sources', 'Get traffic source metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.trafficSources(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('channels', 'Get channel metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.defaultChannelGroup(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('countries', 'Get country metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.countries(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('devices', 'Get device metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.devices(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('events', 'Get event metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.events(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('conversions', 'Get conversion metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.conversions(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('engagement', 'Get engagement metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.engagementRate(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));
      register('realtime', 'Get real-time metrics', createInputSchema('userId', 'propertyId', 'startDate', 'endDate'), async (args) => googleAnalyticsService.realtime(args.userId, args.propertyId, { startDate: args.startDate, endDate: args.endDate }));

      register('analyze_url', 'Analyze a URL with PageSpeed Insights', createInputSchema('userId', 'url', 'strategy'), async (args) => pageSpeedService.analyzeUrl(args.userId, args.url, { strategy: args.strategy as any }));
      register('core_web_vitals', 'Get Core Web Vitals metrics', createInputSchema('userId', 'url'), async (args) => pageSpeedService.coreWebVitals(args.userId, args.url));
      register('technical_audit', 'Run a technical SEO audit', createInputSchema('userId', 'url'), async (args) => pageSpeedService.analyzeUrl(args.userId, args.url));
      register('performance_report', 'Get performance report', createInputSchema('userId', 'url'), async (args) => pageSpeedService.performanceMetrics(args.userId, args.url));

      register('seo_health', 'Get SEO health scorecard', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.weeklySummary(args.userId, args.siteUrl, args.propertyId, {}));
      register('seo_opportunities', 'Get SEO opportunities', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.highImpressionLowCTR(args.userId, args.siteUrl, args.propertyId, {}));
      register('traffic_drop_analysis', 'Analyze traffic drops', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.trafficDropAnalysis(args.userId, args.siteUrl, args.propertyId, {}));
      register('ranking_drop_analysis', 'Analyze ranking drops', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.rankingDropAnalysis(args.userId, args.siteUrl, args.propertyId, {}));
      register('weekly_report', 'Get weekly SEO report', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.weeklySummary(args.userId, args.siteUrl, args.propertyId, {}));
      register('monthly_report', 'Get monthly SEO report', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.monthlySummary(args.userId, args.siteUrl, args.propertyId, {}));
      register('website_summary', 'Get website SEO summary', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.weeklySummary(args.userId, args.siteUrl, args.propertyId, {}));
      register('content_opportunities', 'Get content opportunities', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.contentRefreshCandidates(args.userId, args.siteUrl, args.propertyId, {}));
      register('keyword_opportunities', 'Get keyword opportunities', createInputSchema('userId', 'siteUrl', 'propertyId'), async (args) => seoInsightService.newKeywordOpportunities(args.userId, args.siteUrl, args.propertyId, {}));

      register(
        'generate_ai_report_json',
        'Generate an AI SEO report in JSON format from Search Console, GA4, PageSpeed, and SEO Intelligence data.',
        createInputSchema('userId', 'reportType', 'siteUrl', 'propertyId', 'url', 'startDate', 'endDate', 'comparisonStartDate', 'comparisonEndDate'),
        async (args) => {
          const reportType = args.reportType ?? 'weekly-seo-report';
          const result = await reportEngine.generate({
            userId: args.userId,
            reportType,
            siteUrl: args.siteUrl,
            propertyId: args.propertyId,
            url: args.url,
            startDate: args.startDate,
            endDate: args.endDate,
            comparisonStartDate: args.comparisonStartDate,
            comparisonEndDate: args.comparisonEndDate,
          }, 'json');
          return {
            format: result.format,
            reportType: result.report.reportType,
            title: result.report.title,
            content: result.content,
          };
        }
      );

      register(
        'generate_ai_report_markdown',
        'Generate an AI SEO report in Markdown format.',
        createInputSchema('userId', 'reportType', 'siteUrl', 'propertyId', 'url', 'startDate', 'endDate', 'comparisonStartDate', 'comparisonEndDate'),
        async (args) => {
          const reportType = args.reportType ?? 'weekly-seo-report';
          const result = await reportEngine.generate({
            userId: args.userId,
            reportType,
            siteUrl: args.siteUrl,
            propertyId: args.propertyId,
            url: args.url,
            startDate: args.startDate,
            endDate: args.endDate,
            comparisonStartDate: args.comparisonStartDate,
            comparisonEndDate: args.comparisonEndDate,
          }, 'markdown');
          return {
            format: result.format,
            reportType: result.report.reportType,
            title: result.report.title,
            content: result.content,
          };
        }
      );

      register(
        'generate_ai_report_html',
        'Generate an AI SEO report in HTML format with PDF-ready print styles.',
        createInputSchema('userId', 'reportType', 'siteUrl', 'propertyId', 'url', 'startDate', 'endDate', 'comparisonStartDate', 'comparisonEndDate'),
        async (args) => {
          const reportType = args.reportType ?? 'weekly-seo-report';
          const result = await reportEngine.generate({
            userId: args.userId,
            reportType,
            siteUrl: args.siteUrl,
            propertyId: args.propertyId,
            url: args.url,
            startDate: args.startDate,
            endDate: args.endDate,
            comparisonStartDate: args.comparisonStartDate,
            comparisonEndDate: args.comparisonEndDate,
          }, 'html');
          return {
            format: result.format,
            reportType: result.report.reportType,
            title: result.report.title,
            content: result.content,
          };
        }
      );

      register(
        'list_ai_report_types',
        'List all available AI report types that can be generated by the report engine.',
        createInputSchema(),
        async () => ({
          reportTypes: [
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
          ],
          formats: ['json', 'markdown', 'html'],
        })
      );
    },
  };
}
