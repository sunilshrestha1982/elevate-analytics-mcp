export interface RecommendationEngineDependencies {
  insightService: {
    trafficDropAnalysis(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    highImpressionLowCTR(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    contentRefreshCandidates(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
  };
}

export class RecommendationEngine {
  constructor(private readonly deps: RecommendationEngineDependencies) {}

  async generate(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>) {
    const [trafficDrop, ctr, refresh] = await Promise.all([
      this.deps.insightService.trafficDropAnalysis(userId, siteUrl, propertyId, input),
      this.deps.insightService.highImpressionLowCTR(userId, siteUrl, propertyId, input),
      this.deps.insightService.contentRefreshCandidates(userId, siteUrl, propertyId, input),
    ]);
    return { trafficDrop, ctr, refresh };
  }
}
