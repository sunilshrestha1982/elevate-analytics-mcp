import type { Priority, ReportInsight, ReportRequest, ReportSnapshot, RootCause } from './types.js';

export class InsightGenerator {
  generateInsights(request: ReportRequest, snapshot: ReportSnapshot): ReportInsight[] {
    const insights: ReportInsight[] = [];

    insights.push({
      title: 'Organic Visibility',
      detail: `Top query portfolio contains ${snapshot.searchConsole.topQueries.length} tracked opportunities.`,
      severity: this.priorityFromValue(snapshot.searchConsole.summary.position, true),
    });

    insights.push({
      title: 'Traffic Quality',
      detail: `Engagement rate is ${(snapshot.analytics.summary.engagementRate * 100).toFixed(1)}% across ${snapshot.analytics.summary.sessions} sessions.`,
      severity: this.priorityFromValue(snapshot.analytics.summary.engagementRate * 100, false),
    });

    insights.push({
      title: 'Technical Readiness',
      detail: `Technical SEO score is ${snapshot.pageSpeed.scorecard.technicalSeoScore} with ${snapshot.pageSpeed.opportunities.length} opportunities.`,
      severity: this.priorityFromValue(snapshot.pageSpeed.scorecard.technicalSeoScore, false),
    });

    if (request.reportType === 'competitor-comparison') {
      insights.push({
        title: 'Competitor Comparison Framework',
        detail: 'Framework-only mode enabled. Add competitor feeds to activate benchmark scoring and gap metrics.',
        severity: 'medium',
      });
    }

    return insights;
  }

  generateRootCauseAnalysis(snapshot: ReportSnapshot): RootCause[] {
    const causes: RootCause[] = [];

    if (snapshot.searchConsole.summary.ctr < 0.03) {
      causes.push({
        title: 'Low SERP CTR',
        explanation: 'Meta titles/descriptions are not converting impressions into clicks for core queries.',
        confidence: 0.78,
      });
    }

    if (snapshot.pageSpeed.scorecard.coreWebVitalsScore < 75) {
      causes.push({
        title: 'Core Web Vitals Friction',
        explanation: 'Performance instability is reducing engagement and likely suppressing rankings.',
        confidence: 0.74,
      });
    }

    if (snapshot.analytics.summary.conversions < Math.max(1, snapshot.analytics.summary.sessions * 0.02)) {
      causes.push({
        title: 'Weak Conversion Path',
        explanation: 'Traffic is not efficiently converting due to CTA, layout, or intent mismatch issues.',
        confidence: 0.69,
      });
    }

    if (causes.length === 0) {
      causes.push({
        title: 'No Critical Root Cause',
        explanation: 'Current indicators show balanced performance without a dominant risk driver.',
        confidence: 0.55,
      });
    }

    return causes;
  }

  private priorityFromValue(value: number, lowerIsWorse: boolean): Priority {
    const normalized = lowerIsWorse ? Math.max(0, 100 - value * 7) : value;
    if (normalized < 40) return 'critical';
    if (normalized < 60) return 'high';
    if (normalized < 80) return 'medium';
    return 'low';
  }
}
