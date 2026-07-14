export interface SEOAnalyzerDependencies {
  insightService: {
    trafficDropAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    trafficGrowthAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    rankingDropAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    rankingGrowthAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
  };
}

export class SEOAnalyzer {
  constructor(private readonly deps: SEOAnalyzerDependencies) {}

  async analyze(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>) {
    const [trafficDrop, trafficGrowth, rankingDrop, rankingGrowth] = await Promise.all([
      this.deps.insightService.trafficDropAnalysis(userId, siteUrl, propertyId, input),
      this.deps.insightService.trafficGrowthAnalysis(userId, siteUrl, propertyId, input),
      this.deps.insightService.rankingDropAnalysis(userId, siteUrl, propertyId, input),
      this.deps.insightService.rankingGrowthAnalysis(userId, siteUrl, propertyId, input),
    ]);
    return { trafficDrop, trafficGrowth, rankingDrop, rankingGrowth };
  }
}
