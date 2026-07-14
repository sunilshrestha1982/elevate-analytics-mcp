export interface ContentAnalyzerDependencies {
  insightService: {
    decliningLandingPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    risingLandingPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    highBouncePages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
    highExitPages(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>): Promise<unknown>;
  };
}

export class ContentAnalyzer {
  constructor(private readonly deps: ContentAnalyzerDependencies) {}

  async analyze(userId: number, siteUrl: string, propertyId: string, input: Record<string, unknown>) {
    const [declining, rising, bounce, exits] = await Promise.all([
      this.deps.insightService.decliningLandingPages(userId, siteUrl, propertyId, input),
      this.deps.insightService.risingLandingPages(userId, siteUrl, propertyId, input),
      this.deps.insightService.highBouncePages(userId, siteUrl, propertyId, input),
      this.deps.insightService.highExitPages(userId, siteUrl, propertyId, input),
    ]);
    return { declining, rising, bounce, exits };
  }
}
