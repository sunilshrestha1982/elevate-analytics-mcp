import type { Forecast, ReportSnapshot } from './types.js';

export class ForecastEngine {
  project(snapshot: ReportSnapshot): Forecast {
    const ctrFactor = snapshot.searchConsole.summary.ctr * 100;
    const technicalFactor = snapshot.pageSpeed.scorecard.performanceScore;
    const conversionRate = snapshot.analytics.summary.conversions / Math.max(1, snapshot.analytics.summary.sessions);

    const expectedTrafficDeltaPct = Number(((ctrFactor * 0.25) + ((technicalFactor - 60) * 0.35)).toFixed(2));
    const expectedConversionDeltaPct = Number(((conversionRate * 100 * 0.8) + ((technicalFactor - 65) * 0.15)).toFixed(2));
    const confidence = Math.max(0.45, Math.min(0.9, 0.55 + (technicalFactor / 400)));

    return {
      horizonDays: 30,
      expectedTrafficDeltaPct,
      expectedConversionDeltaPct,
      confidence: Number(confidence.toFixed(2)),
    };
  }
}
