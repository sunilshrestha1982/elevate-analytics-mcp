export interface TechnicalSEOAnalyzerResult {
  technicalSeoScore: number;
  performanceScore: number;
  coreWebVitalsScore: number;
  accessibilityScore: number;
  overallSiteHealthScore: number;
}

export class TechnicalSEOAnalyzer {
  analyze(report: { lighthouseResult?: { categories?: Record<string, { score?: number }> } }): TechnicalSEOAnalyzerResult {
    const categories = report.lighthouseResult?.categories ?? {};
    const technicalSeo = Number(categories.seo?.score ?? 0.7) * 100;
    const performance = Number(categories.performance?.score ?? 0.7) * 100;
    const accessibility = Number(categories.accessibility?.score ?? 0.8) * 100;
    const bestPractices = Number(categories['best-practices']?.score ?? 0.8) * 100;
    const coreWebVitals = Math.round((performance + accessibility + bestPractices) / 3);
    return {
      technicalSeoScore: Math.round(technicalSeo),
      performanceScore: Math.round(performance),
      coreWebVitalsScore: coreWebVitals,
      accessibilityScore: Math.round(accessibility),
      overallSiteHealthScore: Math.round((technicalSeo * 0.3) + (performance * 0.3) + (accessibility * 0.2) + (bestPractices * 0.2)),
    };
  }
}
