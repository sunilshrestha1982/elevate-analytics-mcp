import type { GeneratedReport } from './types.js';

export class NarrativeBuilder {
  toMarkdown(report: GeneratedReport): string {
    const recommendations = report.recommendations
      .map((item) => `- [${item.priority.toUpperCase()}] ${item.title}: ${item.description} (impact: ${item.estimatedImpact}, effort: ${item.estimatedEffort})`)
      .join('\n');

    const actions = report.actionPlan
      .map((item) => `- ${item.action} | owner: ${item.owner} | due: ${item.dueDate} | priority: ${item.priority}`)
      .join('\n');

    const insights = report.insights.map((item) => `- ${item.title}: ${item.detail} (${item.severity})`).join('\n');
    const rootCauses = report.rootCauseAnalysis.map((item) => `- ${item.title}: ${item.explanation} (confidence ${Math.round(item.confidence * 100)}%)`).join('\n');
    const keyMetrics = report.keyMetrics.map((m) => `- ${m.label}: ${m.value}${m.unit ? ` ${m.unit}` : ''}`).join('\n');
    const keyChanges = report.keyChanges.map((item) => `- ${item}`).join('\n');

    return `# ${report.title}\n\n## Executive Summary\n${report.executiveSummary}\n\n## Key Metrics\n${keyMetrics}\n\n## Key Changes\n${keyChanges}\n\n## Insights\n${insights}\n\n## Root Cause Analysis\n${rootCauses}\n\n## Recommendations\n${recommendations}\n\n## Priority Matrix\n- Critical: ${report.priorityMatrix.critical.length}\n- High: ${report.priorityMatrix.high.length}\n- Medium: ${report.priorityMatrix.medium.length}\n- Low: ${report.priorityMatrix.low.length}\n\n## Estimated Impact\n${report.estimatedImpact}\n\n## Estimated Effort\n${report.estimatedEffort}\n\n## Action Plan\n${actions}\n\n## Next Review Date\n${report.nextReviewDate}\n`;
  }

  toHtml(report: GeneratedReport): string {
    const css = `<style>
      @page { size: A4; margin: 20mm; }
      body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.5; color: #1a1a1a; }
      h1, h2 { color: #0f3d3e; margin-bottom: 8px; }
      section { break-inside: avoid; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #d6d6d6; padding: 8px; text-align: left; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .chip { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #f2f7f7; margin-right: 6px; }
      @media print { .no-print { display: none; } }
    </style>`;

    const metricsRows = report.keyMetrics.map((m) => `<tr><td>${m.label}</td><td>${m.value}${m.unit ? ` ${m.unit}` : ''}</td></tr>`).join('');
    const insights = report.insights.map((item) => `<li><strong>${item.title}</strong>: ${item.detail} (${item.severity})</li>`).join('');
    const causes = report.rootCauseAnalysis.map((item) => `<li><strong>${item.title}</strong>: ${item.explanation} (confidence ${Math.round(item.confidence * 100)}%)</li>`).join('');
    const recs = report.recommendations.map((item) => `<li><strong>${item.title}</strong> [${item.priority}] - ${item.description}<br/>Impact: ${item.estimatedImpact}, Effort: ${item.estimatedEffort}, Owner: ${item.owner}</li>`).join('');
    const actions = report.actionPlan.map((item) => `<li>${item.action} | ${item.owner} | due ${item.dueDate} | ${item.priority}</li>`).join('');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${report.title}</title>
${css}
</head>
<body>
  <h1>${report.title}</h1>
  <section>
    <h2>Executive Summary</h2>
    <p>${report.executiveSummary}</p>
  </section>
  <section>
    <h2>Key Metrics</h2>
    <table><tbody>${metricsRows}</tbody></table>
  </section>
  <section>
    <h2>Key Changes</h2>
    <ul>${report.keyChanges.map((c) => `<li>${c}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>Insights</h2>
    <ul>${insights}</ul>
  </section>
  <section>
    <h2>Root Cause Analysis</h2>
    <ul>${causes}</ul>
  </section>
  <section>
    <h2>Recommendations</h2>
    <ul>${recs}</ul>
  </section>
  <section class="grid">
    <div>
      <h2>Priority Matrix</h2>
      <p><span class="chip">Critical: ${report.priorityMatrix.critical.length}</span><span class="chip">High: ${report.priorityMatrix.high.length}</span><span class="chip">Medium: ${report.priorityMatrix.medium.length}</span><span class="chip">Low: ${report.priorityMatrix.low.length}</span></p>
    </div>
    <div>
      <h2>Scores</h2>
      <p>SEO Health: ${report.scores.seoHealthScore}/100<br/>Traffic: ${report.scores.trafficScore}/100<br/>Technical: ${report.scores.technicalScore}/100<br/>Content: ${report.scores.contentScore}/100<br/>Authority: ${report.scores.authorityScore}/100<br/>Growth: ${report.scores.growthScore}/100<br/>Overall Business: ${report.scores.overallBusinessScore}/100</p>
    </div>
  </section>
  <section>
    <h2>Estimated Impact</h2>
    <p>${report.estimatedImpact}</p>
    <h2>Estimated Effort</h2>
    <p>${report.estimatedEffort}</p>
  </section>
  <section>
    <h2>Action Plan</h2>
    <ul>${actions}</ul>
    <p><strong>Next Review Date:</strong> ${report.nextReviewDate}</p>
  </section>
</body>
</html>`;
  }
}
