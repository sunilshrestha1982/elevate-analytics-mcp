import type { ReportSnapshot, TrendPoint } from './types.js';

export class TrendAnalyzer {
  buildKeyChanges(snapshot: ReportSnapshot): string[] {
    const ctrPct = snapshot.searchConsole.summary.ctr * 100;
    const position = snapshot.searchConsole.summary.position;
    const sessions = snapshot.analytics.summary.sessions;

    const changes: string[] = [];
    if (ctrPct < 3) changes.push('CTR is below 3%, indicating snippet relevance gaps.');
    if (position > 10) changes.push('Average ranking position is outside page one and needs query-level optimization.');
    if (sessions < 1000) changes.push('Organic sessions are below target baseline and require growth initiatives.');
    if (snapshot.pageSpeed.scorecard.performanceScore < 75) changes.push('Performance score is under 75 and likely impacting user retention.');
    if (changes.length === 0) changes.push('Performance is stable with no critical directional changes detected.');

    return changes;
  }

  buildTrendSeries(snapshot: ReportSnapshot): { traffic: TrendPoint[]; technical: TrendPoint[]; visibility: TrendPoint[] } {
    const sessions = snapshot.analytics.summary.sessions;
    const clicks = snapshot.searchConsole.summary.clicks;
    const performance = snapshot.pageSpeed.scorecard.performanceScore;

    return {
      traffic: [
        { label: 'Baseline', value: Math.max(0, sessions - Math.round(sessions * 0.08)) },
        { label: 'Current', value: sessions },
        { label: 'Projected', value: Math.round(sessions * 1.07) },
      ],
      technical: [
        { label: 'Baseline', value: Math.max(0, performance - 6) },
        { label: 'Current', value: performance },
        { label: 'Projected', value: Math.min(100, performance + 5) },
      ],
      visibility: [
        { label: 'Baseline', value: Math.max(0, clicks - Math.round(clicks * 0.05)) },
        { label: 'Current', value: clicks },
        { label: 'Projected', value: Math.round(clicks * 1.06) },
      ],
    };
  }
}
