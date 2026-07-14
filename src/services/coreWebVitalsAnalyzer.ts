export class CoreWebVitalsAnalyzer {
  analyze(report: { lighthouseResult?: { audits?: Record<string, { score?: number; numericValue?: number }> } }) {
    const audits = report.lighthouseResult?.audits ?? {};
    const largestContentfulPaint = audits['largest-contentful-paint'] ?? {};
    const interactionToNextPaint = audits['interaction-to-next-paint'] ?? {};
    const cumulativeLayoutShift = audits['cumulative-layout-shift'] ?? {};
    const firstContentfulPaint = audits['first-contentful-paint'] ?? {};
    const speedIndex = audits['speed-index'] ?? {};
    const timeToInteractive = audits['time-to-interactive'] ?? {};
    return {
      metrics: {
        largestContentfulPaint: largestContentfulPaint.numericValue ?? 0,
        interactionToNextPaint: interactionToNextPaint.numericValue ?? 0,
        cumulativeLayoutShift: cumulativeLayoutShift.numericValue ?? 0,
        firstContentfulPaint: firstContentfulPaint.numericValue ?? 0,
        speedIndex: speedIndex.numericValue ?? 0,
        timeToInteractive: timeToInteractive.numericValue ?? 0,
      },
    };
  }
}
