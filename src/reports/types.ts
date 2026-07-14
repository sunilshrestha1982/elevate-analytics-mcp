export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type ReportType =
  | 'weekly-seo-report'
  | 'monthly-seo-report'
  | 'quarterly-seo-report'
  | 'technical-seo-audit'
  | 'content-audit'
  | 'landing-page-audit'
  | 'keyword-opportunity-report'
  | 'traffic-loss-report'
  | 'traffic-growth-report'
  | 'website-health-report'
  | 'competitor-comparison'
  | 'executive-dashboard';

export type ReportFormat = 'json' | 'markdown' | 'html';

export interface ReportRequest {
  userId: number;
  reportType: ReportType;
  siteUrl?: string;
  propertyId?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
}

export interface ReportMetric {
  label: string;
  value: number | string;
  change?: number;
  unit?: string;
}

export interface ReportInsight {
  title: string;
  detail: string;
  severity: Priority;
}

export interface RootCause {
  title: string;
  explanation: string;
  confidence: number;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: Priority;
  estimatedImpact: 'low' | 'medium' | 'high';
  estimatedEffort: 'low' | 'medium' | 'high';
  owner: string;
}

export interface ActionPlanItem {
  action: string;
  owner: string;
  priority: Priority;
  dueDate: string;
  status: 'planned' | 'in-progress' | 'done';
}

export interface Scorecard {
  seoHealthScore: number;
  trafficScore: number;
  technicalScore: number;
  contentScore: number;
  authorityScore: number;
  growthScore: number;
  overallBusinessScore: number;
}

export interface PriorityMatrix {
  critical: Recommendation[];
  high: Recommendation[];
  medium: Recommendation[];
  low: Recommendation[];
}

export interface Forecast {
  horizonDays: number;
  expectedTrafficDeltaPct: number;
  expectedConversionDeltaPct: number;
  confidence: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface ReportSnapshot {
  searchConsole: {
    summary: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    };
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  };
  analytics: {
    summary: {
      sessions: number;
      users: number;
      conversions: number;
      engagementRate: number;
    };
    landingPages: Array<{ page: string; sessions: number; bounceRate: number }>;
    channels: Array<{ channel: string; sessions: number }>;
  };
  pageSpeed: {
    scorecard: {
      technicalSeoScore: number;
      performanceScore: number;
      coreWebVitalsScore: number;
      accessibilityScore: number;
      overallSiteHealthScore: number;
    };
    opportunities: Array<Record<string, unknown>>;
  };
  seoIntelligence: {
    title: string;
    scorecard: {
      seoHealth: number;
      opportunity: number;
      technical: number;
      content: number;
      growth: number;
    };
    highlights: string[];
  };
}

export interface GeneratedReport {
  reportType: ReportType;
  title: string;
  generatedAt: string;
  executiveSummary: string;
  keyMetrics: ReportMetric[];
  keyChanges: string[];
  insights: ReportInsight[];
  rootCauseAnalysis: RootCause[];
  recommendations: Recommendation[];
  priorityMatrix: PriorityMatrix;
  estimatedImpact: string;
  estimatedEffort: string;
  actionPlan: ActionPlanItem[];
  nextReviewDate: string;
  scores: Scorecard;
  forecast: Forecast;
  output: {
    json: string;
    markdown: string;
    html: string;
  };
}
