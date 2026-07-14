import type { GoogleAnalyticsRow, GoogleAnalyticsSummary } from './googleAnalyticsService.js';

export class GoogleAnalyticsMapper {
  mapRows(rows: Array<Record<string, unknown>>, request: { sort?: string; dimensions?: string[]; metrics?: string[] }) {
    return rows.map((row) => {
      const dimensionValues = Array.isArray(row.dimensionValues) ? row.dimensionValues : [];
      const metricValues = Array.isArray(row.metricValues) ? row.metricValues : [];
      const dimensions = Object.fromEntries(
        (request.dimensions ?? []).map((dimension, index) => [this.toPropertyName(dimension), dimensionValues[index]?.value ?? ''])
      );
      const metrics = Object.fromEntries(
        (request.metrics ?? []).map((metric, index) => [this.toPropertyName(metric), Number(metricValues[index]?.value ?? 0)])
      );
      return {
        dimensions,
        metrics,
      } as GoogleAnalyticsRow;
    });
  }

  mapSummary(totals: Array<Record<string, unknown>> | undefined, metrics: string[] = []): GoogleAnalyticsSummary {
    const summary = Object.fromEntries(
      (metrics.length ? metrics : ['sessions']).map((metric, index) => [this.toPropertyName(metric), Number(totals?.[index]?.value ?? 0)])
    );
    return summary as GoogleAnalyticsSummary;
  }

  private toPropertyName(value: string) {
    return value.trim();
  }
}
