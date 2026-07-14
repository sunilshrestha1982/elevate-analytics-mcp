import type { ReportRequest, ReportSnapshot, ReportMetric, Scorecard } from './types.js';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export class ExecutiveSummaryService {
  buildScores(snapshot: ReportSnapshot): Scorecard {
    const trafficScore = clampScore((snapshot.analytics.summary.sessions / 2000) * 100);
    const technicalScore = clampScore((snapshot.pageSpeed.scorecard.technicalSeoScore + snapshot.pageSpeed.scorecard.coreWebVitalsScore) / 2);
    const contentScore = clampScore((snapshot.searchConsole.summary.ctr * 900) + 30);
    const authorityScore = clampScore(100 - snapshot.searchConsole.summary.position * 3);
    const growthScore = clampScore((snapshot.seoIntelligence.scorecard.growth + trafficScore) / 2);
    const seoHealthScore = clampScore((snapshot.seoIntelligence.scorecard.seoHealth + technicalScore + contentScore) / 3);
    const overallBusinessScore = clampScore((seoHealthScore * 0.25) + (trafficScore * 0.2) + (technicalScore * 0.15) + (contentScore * 0.1) + (authorityScore * 0.15) + (growthScore * 0.15));

    return {
      seoHealthScore,
      trafficScore,
      technicalScore,
      contentScore,
      authorityScore,
      growthScore,
      overallBusinessScore,
    };
  }

  buildExecutiveSummary(request: ReportRequest, snapshot: ReportSnapshot, scores: Scorecard): string {
    const reportLabel = request.reportType.replace(/-/g, ' ');
    const clicks = snapshot.searchConsole.summary.clicks;
    const sessions = snapshot.analytics.summary.sessions;
    const opportunities = snapshot.pageSpeed.opportunities.length;

    return `This ${reportLabel} reports ${clicks} organic clicks, ${sessions} sessions, and ${opportunities} technical opportunities. Overall business score is ${scores.overallBusinessScore}/100, with SEO health at ${scores.seoHealthScore}/100 and technical strength at ${scores.technicalScore}/100.`;
  }

  buildKeyMetrics(snapshot: ReportSnapshot, scores: Scorecard): ReportMetric[] {
    return [
      { label: 'Organic Clicks', value: snapshot.searchConsole.summary.clicks, unit: 'clicks' },
      { label: 'Impressions', value: snapshot.searchConsole.summary.impressions, unit: 'impressions' },
      { label: 'CTR', value: Number((snapshot.searchConsole.summary.ctr * 100).toFixed(2)), unit: '%' },
      { label: 'Average Position', value: Number(snapshot.searchConsole.summary.position.toFixed(2)) },
      { label: 'Sessions', value: snapshot.analytics.summary.sessions, unit: 'sessions' },
      { label: 'Users', value: snapshot.analytics.summary.users, unit: 'users' },
      { label: 'Conversions', value: snapshot.analytics.summary.conversions, unit: 'conversions' },
      { label: 'SEO Health Score', value: scores.seoHealthScore, unit: '/100' },
      { label: 'Overall Business Score', value: scores.overallBusinessScore, unit: '/100' },
    ];
  }
}
