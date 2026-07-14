export interface OpportunityEngineDependencies {
  insightService: {
    highImpressionLowCTR(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    keywordsNearPageOne(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    newKeywordOpportunities(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
  };
}

export class OpportunityEngine {
  constructor(private readonly deps: OpportunityEngineDependencies) {}

  async evaluate(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>) {
    const [ctr, pageOne, newKeywords] = await Promise.all([
      this.deps.insightService.highImpressionLowCTR(userId, siteUrl, propertyId, input),
      this.deps.insightService.keywordsNearPageOne(userId, siteUrl, propertyId, input),
      this.deps.insightService.newKeywordOpportunities(userId, siteUrl, propertyId, input),
    ]);
    return { ctr, pageOne, newKeywords };
  }
}
