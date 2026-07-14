import type { PriorityMatrix, Recommendation, ReportRequest, ReportSnapshot } from './types.js';

export class RecommendationGenerator {
  generateRecommendations(request: ReportRequest, snapshot: ReportSnapshot): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (snapshot.searchConsole.summary.ctr < 0.03) {
      recommendations.push({
        title: 'Improve SERP Snippet CTR',
        description: 'Refresh title tags and meta descriptions for top impression queries.',
        priority: 'high',
        estimatedImpact: 'high',
        estimatedEffort: 'low',
        owner: 'SEO Team',
      });
    }

    if (snapshot.pageSpeed.scorecard.performanceScore < 75) {
      recommendations.push({
        title: 'Reduce Render-Blocking Assets',
        description: 'Eliminate render-blocking scripts and optimize above-the-fold resources.',
        priority: 'critical',
        estimatedImpact: 'high',
        estimatedEffort: 'medium',
        owner: 'Engineering',
      });
    }

    if (snapshot.analytics.summary.conversions < Math.max(1, snapshot.analytics.summary.sessions * 0.02)) {
      recommendations.push({
        title: 'Optimize Conversion Journey',
        description: 'Improve CTA clarity and reduce friction on high-traffic landing pages.',
        priority: 'high',
        estimatedImpact: 'high',
        estimatedEffort: 'medium',
        owner: 'Growth Team',
      });
    }

    if (request.reportType === 'content-audit') {
      recommendations.push({
        title: 'Refresh Underperforming Content',
        description: 'Update stale pages with intent-aligned sections, FAQs, and stronger internal links.',
        priority: 'medium',
        estimatedImpact: 'medium',
        estimatedEffort: 'medium',
        owner: 'Content Team',
      });
    }

    if (request.reportType === 'competitor-comparison') {
      recommendations.push({
        title: 'Connect Competitor Data Sources',
        description: 'Wire benchmark APIs and rank-tracking feeds to enable comparative scoring.',
        priority: 'medium',
        estimatedImpact: 'medium',
        estimatedEffort: 'high',
        owner: 'Data Team',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Maintain Current Execution Cadence',
        description: 'Continue monitoring trends and run focused experiments on top opportunities.',
        priority: 'low',
        estimatedImpact: 'medium',
        estimatedEffort: 'low',
        owner: 'SEO Team',
      });
    }

    return recommendations;
  }

  buildPriorityMatrix(recommendations: Recommendation[]): PriorityMatrix {
    return {
      critical: recommendations.filter((item) => item.priority === 'critical'),
      high: recommendations.filter((item) => item.priority === 'high'),
      medium: recommendations.filter((item) => item.priority === 'medium'),
      low: recommendations.filter((item) => item.priority === 'low'),
    };
  }

  summarizeEstimatedImpact(recommendations: Recommendation[]): string {
    const counts = recommendations.reduce(
      (acc, item) => {
        acc[item.estimatedImpact] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );
    return `Impact mix: high ${counts.high}, medium ${counts.medium}, low ${counts.low}.`;
  }

  summarizeEstimatedEffort(recommendations: Recommendation[]): string {
    const counts = recommendations.reduce(
      (acc, item) => {
        acc[item.estimatedEffort] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );
    return `Effort mix: high ${counts.high}, medium ${counts.medium}, low ${counts.low}.`;
  }
}
