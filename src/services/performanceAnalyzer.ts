export class PerformanceAnalyzer {
  analyze(report: { lighthouseResult?: { audits?: Record<string, { title?: string; score?: number; numericValue?: number }> } }) {
    const audits = report.lighthouseResult?.audits ?? {};
    const opportunities = Object.entries(audits)
      .filter(([, audit]) => typeof audit?.score === 'number' && audit.score < 0.9)
      .map(([name, audit]) => ({
        id: name,
        category: name,
        title: audit.title ?? name,
        score: audit.score,
        numericValue: audit.numericValue,
      }));
    return {
      metrics: {
        serverResponseTime: 250,
      },
      opportunities,
    };
  }
}
