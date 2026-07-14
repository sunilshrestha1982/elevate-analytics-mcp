export interface TrendAnalyzerDependencies {
  insightService: {
    weeklySummary(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    monthlySummary(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    quarterlySummary(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
  };
}

export class TrendAnalyzer {
  constructor(private readonly deps: TrendAnalyzerDependencies) {}

  async analyze(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>) {
    const [weekly, monthly, quarterly] = await Promise.all([
      this.deps.insightService.weeklySummary(userId, siteUrl, propertyId, input),
      this.deps.insightService.monthlySummary(userId, siteUrl, propertyId, input),
      this.deps.insightService.quarterlySummary(userId, siteUrl, propertyId, input),
    ]);
    return { weekly, monthly, quarterly };
  }
}
