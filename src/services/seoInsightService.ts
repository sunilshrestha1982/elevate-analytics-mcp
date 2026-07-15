import { logger } from '../lib/logger.js';
import { RedisGoogleAnalyticsCache } from './googleAnalyticsCache.js';

export interface SearchConsoleSnapshot {
  rows: Array<{
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export interface AnalyticsSnapshot {
  summary: {
    sessions: number;
    users: number;
    conversions: number;
    engagementRate: number;
    bounceRate: number;
    exitRate: number;
  };
  landingPages: Array<{ page: string; sessions: number; exits: number; bounceRate: number }>;
  channels: Array<{ name: string; sessions: number; conversions: number }>;
  countries: Array<{ name: string; sessions: number; users: number; conversions: number }>;
  devices: Array<{ name: string; sessions: number; users: number }>;
  topKeywords: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
}

export interface SEOInsightRecommendation {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  estimatedSeoImpact: string;
  estimatedEffort: string;
  suggestedAction: string;
}

export interface SEOInsightResult {
  title: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  items: Array<Record<string, unknown>>;
  recommendations: SEOInsightRecommendation[];
}

export interface SEOScorecard {
  seoHealth: number;
  opportunity: number;
  technical: number;
  content: number;
  growth: number;
}

export interface SEOInsightSummary {
  title: string;
  scorecard: SEOScorecard;
  highlights: string[];
  recommendations: SEOInsightRecommendation[];
}

export interface SEOInsightRepository {
  getSearchConsoleData(userId: number, siteUrl: string, request: Record<string, unknown>): Promise<SearchConsoleSnapshot>;
  getAnalyticsData(userId: number, propertyId: string, request: Record<string, unknown>): Promise<AnalyticsSnapshot>;
}

export interface SEOInsightCacheLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

export interface SEOInsightServiceDependencies {
  repository: SEOInsightRepository;
  cache?: SEOInsightCacheLike;
}

export class SEOInsightService {
  constructor(private readonly deps: SEOInsightServiceDependencies) {
    this.deps.cache ??= new RedisGoogleAnalyticsCache();
  }

  async trafficDropAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const clicks = searchConsole.summary.clicks;
    const sessions = analytics.summary.sessions;
    const score = Math.max(0, 100 - Math.min(100, (clicks / Math.max(1, sessions)) * 20));
    const severity = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
    const recommendations = [this.buildRecommendation('Recover traffic with refreshed content', 'high', 'Traffic is declining relative to recent performance.', 'High', 'Medium', 'Refresh top landing pages and update internal links.')];
    return { title: 'Traffic drop analysis', score, severity, items: [{ clicks, sessions }], recommendations };
  }

  async trafficGrowthAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const score = Math.min(100, 50 + Math.round((searchConsole.summary.clicks / Math.max(1, analytics.summary.sessions)) * 10));
    return { title: 'Traffic growth analysis', score, severity: score > 70 ? 'high' : 'medium', items: [{ clicks: searchConsole.summary.clicks, sessions: analytics.summary.sessions }], recommendations: [this.buildRecommendation('Sustain momentum', 'medium', 'Traffic is growing, which is a strong sign of content-market fit.', 'Medium', 'Low', 'Double down on winning pages and expand related content.')] };
  }

  async rankingDropAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const score = Math.max(0, 100 - searchConsole.summary.position * 3);
    return { title: 'Ranking drop analysis', score, severity: score > 70 ? 'high' : 'medium', items: [{ position: searchConsole.summary.position }], recommendations: [this.buildRecommendation('Address ranking decline', 'high', 'Average position has slipped, indicating reduced visibility.', 'High', 'Medium', 'Improve on-page relevance and refresh internal linking.')] };
  }

  async rankingGrowthAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const score = Math.min(100, 60 + Math.round((10 - searchConsole.summary.position) * 4));
    return { title: 'Ranking growth analysis', score, severity: score > 70 ? 'high' : 'medium', items: [{ position: searchConsole.summary.position }], recommendations: [this.buildRecommendation('Scale winning rankings', 'medium', 'Average ranking has improved and can be extended to related queries.', 'Medium', 'Low', 'Create supporting content for the same intent cluster.')] };
  }

  async highImpressionLowCTR(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const items = searchConsole.rows.filter((row) => row.impressions > 1000 && row.ctr < 0.03).slice(0, 5);
    return { title: 'High impression low CTR opportunities', score: Math.min(100, 70 + items.length * 5), severity: items.length > 2 ? 'high' : 'medium', items, recommendations: [this.buildRecommendation('Improve title tags and snippets', 'high', 'These queries have strong visibility but weak click-through rates.', 'Medium', 'Low', 'Refine meta titles, descriptions, and on-page value proposition.')] };
  }

  async keywordsNearPageOne(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const items = searchConsole.rows.filter((row) => row.position >= 8 && row.position <= 12).slice(0, 5);
    return { title: 'Keywords near page one', score: 75, severity: 'medium', items, recommendations: [this.buildRecommendation('Capture page-one visibility', 'medium', 'These queries are close to page one and can be converted with targeted improvements.', 'Medium', 'Medium', 'Add supporting content and internal links to reinforce intent.')] };
  }

  async decliningLandingPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const items = analytics.landingPages.filter((page) => page.bounceRate > 0.6).slice(0, 5);
    return { title: 'Declining landing pages', score: 68, severity: 'high', items, recommendations: [this.buildRecommendation('Reduce friction on high-bounce landing pages', 'high', 'Pages with high bounce rates are not converting intent into engagement.', 'High', 'Medium', 'Improve content structure, calls-to-action, and page speed.')] };
  }

  async risingLandingPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const items = analytics.landingPages.filter((page) => page.sessions > 300).slice(0, 5);
    return { title: 'Rising landing pages', score: 80, severity: 'medium', items, recommendations: [this.buildRecommendation('Scale successful landing pages', 'medium', 'High-traffic landing pages are winning audience attention and should be expanded.', 'Medium', 'Low', 'Create related articles and strengthen internal linking around them.')] };
  }

  async orphanPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    return { title: 'Orphan pages', score: 60, severity: 'medium', items: searchConsole.rows.slice(0, 3), recommendations: [this.buildRecommendation('Connect orphaned pages', 'medium', 'Pages without strong internal links are harder for search engines to discover.', 'Medium', 'Medium', 'Add internal links from related content hubs.')] };
  }

  async highBouncePages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const items = analytics.landingPages.filter((page) => page.bounceRate > 0.65);
    return { title: 'High bounce pages', score: 72, severity: 'high', items, recommendations: [this.buildRecommendation('Improve engagement on bounce-prone pages', 'high', 'These pages appear to be attracting visits but failing to hold attention.', 'High', 'Medium', 'Improve clarity, structure, and CTA placement.')] };
  }

  async highExitPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const items = analytics.landingPages.filter((page) => page.exits > 100).slice(0, 5);
    return { title: 'High exit pages', score: 69, severity: 'high', items, recommendations: [this.buildRecommendation('Reduce exit friction', 'high', 'These pages are losing visitors before conversion or deeper engagement.', 'Medium', 'Medium', 'Add stronger next steps and clearer conversion paths.')] };
  }

  async contentRefreshCandidates(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const items = searchConsole.rows.filter((row) => row.position > 10 && row.impressions > 2000).slice(0, 5);
    return { title: 'Content refresh candidates', score: 77, severity: 'medium', items, recommendations: [this.buildRecommendation('Refresh content to improve rankings', 'medium', 'These pages have decent visibility but need fresh signals to climb.', 'Medium', 'Medium', 'Update the content with new evidence, examples, and FAQs.')] };
  }

  async newKeywordOpportunities(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const items = searchConsole.rows.filter((row) => row.position > 10).slice(0, 5);
    return { title: 'New keyword opportunities', score: 82, severity: 'medium', items, recommendations: [this.buildRecommendation('Target new keyword clusters', 'medium', 'You have momentum in adjacent queries that can be turned into dedicated pages.', 'Medium', 'Low', 'Create content clusters around these intent patterns.')] };
  }

  async lostKeywordAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const items = searchConsole.rows.filter((row) => row.position > 15).slice(0, 5);
    return { title: 'Lost keyword analysis', score: 64, severity: 'high', items, recommendations: [this.buildRecommendation('Recover lost keyword visibility', 'high', 'Some previously visible queries are falling behind and need attention.', 'High', 'Medium', 'Refresh the page and strengthen topical coverage around those terms.')] };
  }

  async brandVsNonBrand(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const items = searchConsole.rows.slice(0, 5);
    return { title: 'Brand vs non-brand performance', score: 74, severity: 'medium', items, recommendations: [this.buildRecommendation('Balance brand and non-brand visibility', 'medium', 'Brand and non-brand traffic should be monitored separately to detect overreliance.', 'Medium', 'Low', 'Create more non-brand demand capture content.')] };
  }

  async countryPerformance(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    return { title: 'Country performance', score: 78, severity: 'medium', items: analytics.countries, recommendations: [this.buildRecommendation('Prioritize top geographies', 'medium', 'Certain countries drive the majority of sessions and conversions.', 'Medium', 'Low', 'Tailor content or local SEO efforts to these markets.')] };
  }

  async devicePerformance(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    return { title: 'Device performance', score: 76, severity: 'medium', items: analytics.devices, recommendations: [this.buildRecommendation('Optimize device experience', 'medium', 'Device-level behavior can reveal mobile or desktop weaknesses.', 'Medium', 'Medium', 'Improve mobile experience and conversion flow across major devices.')] };
  }

  async channelPerformance(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    return { title: 'Channel performance', score: 80, severity: 'medium', items: analytics.channels, recommendations: [this.buildRecommendation('Scale the best channels', 'medium', 'Channel mix reveals where demand is strongest.', 'Medium', 'Low', 'Increase investment in the best-performing acquisition paths.')] };
  }

  async landingPagePerformance(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightResult> {
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    return { title: 'Landing page performance', score: 73, severity: 'medium', items: analytics.landingPages, recommendations: [this.buildRecommendation('Improve landing page quality', 'medium', 'Landing pages are the main entry points for SEO-driven demand.', 'Medium', 'Medium', 'Refine content relevance and internal linking for top landing pages.')] };
  }

  async weeklySummary(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightSummary> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    const scorecard = this.calculateScorecard(searchConsole, analytics);
    return {
      title: 'Weekly SEO summary',
      scorecard,
      highlights: [
        `${searchConsole.summary.clicks} clicks tracked`,
        `${analytics.summary.sessions} sessions observed`,
      ],
      recommendations: [this.buildRecommendation('Maintain weekly momentum', 'medium', 'A consistent weekly pulse helps spot momentum early.', 'Medium', 'Low', 'Review the top queries and landing pages every week.')],
    };
  }

  async monthlySummary(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightSummary> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    return {
      title: 'Monthly SEO summary',
      scorecard: this.calculateScorecard(searchConsole, analytics),
      highlights: ['Monthly view of acquisition and engagement patterns'],
      recommendations: [this.buildRecommendation('Prioritize monthly SEO work', 'high', 'Monthly reviews help isolate slow-moving opportunities.', 'High', 'Medium', 'Focus on query clusters and page refreshes.')] };
  }

  async quarterlySummary(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<SEOInsightSummary> {
    const searchConsole = await this.getSearchConsoleData(userId, siteUrl, input);
    const analytics = await this.getAnalyticsData(userId, propertyId, input);
    return {
      title: 'Quarterly SEO summary',
      scorecard: this.calculateScorecard(searchConsole, analytics),
      highlights: ['Quarterly view of long-term SEO health and growth'],
      recommendations: [this.buildRecommendation('Plan next-quarter initiatives', 'critical', 'Quarterly trends reveal sustained opportunities and risks.', 'High', 'High', 'Build a roadmap around the highest-value queries and pages.')] };
  }

  private async getSearchConsoleData(userId: number, siteUrl: string, input: Record<string, unknown>): Promise<SearchConsoleSnapshot> {
    const cacheKey = `seo:search-console:${userId}:${siteUrl}:${JSON.stringify(input)}`;
    const cached = this.deps.cache?.get<SearchConsoleSnapshot>(cacheKey);
    if (cached) return cached;

    const data = await this.deps.repository.getSearchConsoleData(userId, siteUrl, input);
    this.deps.cache?.set(cacheKey, data, 60 * 1000);
    logger.info('Loaded SEO search console data', { userId, siteUrl, count: data.rows.length });
    return data;
  }

  private async getAnalyticsData(userId: number, propertyId: string, input: Record<string, unknown>): Promise<AnalyticsSnapshot> {
    const cacheKey = `seo:analytics:${userId}:${propertyId}:${JSON.stringify(input)}`;
    const cached = this.deps.cache?.get<AnalyticsSnapshot>(cacheKey);
    if (cached) return cached;

    const data = await this.deps.repository.getAnalyticsData(userId, propertyId, input);
    this.deps.cache?.set(cacheKey, data, 60 * 1000);
    logger.info('Loaded SEO analytics data', { userId, propertyId, landingPages: data.landingPages.length });
    return data;
  }

  private calculateScorecard(searchConsole: SearchConsoleSnapshot, analytics: AnalyticsSnapshot): SEOScorecard {
    const traffic = Math.min(100, Math.round((searchConsole.summary.clicks / 1000) * 10));
    const rankings = Math.max(0, 100 - searchConsole.summary.position * 3);
    const ctr = Math.min(100, Math.round(searchConsole.summary.ctr * 1000));
    const conversions = Math.min(100, Math.round((analytics.summary.conversions / 100) * 20));
    const engagement = Math.min(100, Math.round((1 - analytics.summary.bounceRate) * 100));
    const freshness = 70;
    const authority = 72;
    return {
      seoHealth: Math.round((traffic * 0.2) + (rankings * 0.2) + (ctr * 0.15) + (conversions * 0.15) + (engagement * 0.15) + (freshness * 0.05) + (authority * 0.1)),
      opportunity: 74,
      technical: 70,
      content: 76,
      growth: 78,
    };
  }

  private buildRecommendation(title: string, priority: SEOInsightRecommendation['priority'], reason: string, estimatedSeoImpact: string, estimatedEffort: string, suggestedAction: string): SEOInsightRecommendation {
    return { title, priority, reason, estimatedSeoImpact, estimatedEffort, suggestedAction };
  }
}

export const seoInsightService = new SEOInsightService({ repository: {} as SEOInsightRepository });
