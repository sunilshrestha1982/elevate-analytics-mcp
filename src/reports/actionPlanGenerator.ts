import type { ActionPlanItem, Recommendation } from './types.js';

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export class ActionPlanGenerator {
  build(recommendations: Recommendation[]): ActionPlanItem[] {
    return recommendations.map((item, index) => ({
      action: item.title,
      owner: item.owner,
      priority: item.priority,
      dueDate: daysFromNow(7 + index * 5),
      status: 'planned',
    }));
  }

  getNextReviewDate(reportType: string): string {
    const date = new Date();
    if (reportType === 'weekly-seo-report') date.setDate(date.getDate() + 7);
    else if (reportType === 'monthly-seo-report') date.setDate(date.getDate() + 30);
    else if (reportType === 'quarterly-seo-report') date.setDate(date.getDate() + 90);
    else date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  }
}
