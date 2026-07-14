import { z } from 'zod';

export const googleAnalyticsReportSchema = z.object({
  startDate: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  endDate: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  comparisonStartDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  comparisonEndDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  dimensions: z.array(z.string()).optional(),
  metrics: z.array(z.string()).min(1).optional(),
  filters: z.record(z.string()).optional(),
  sort: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  metricAggregations: z.array(z.enum(['TOTAL', 'MINIMUM', 'MAXIMUM', 'COUNT'])).optional(),
  orderBy: z.string().optional(),
});

export type GoogleAnalyticsReportInput = z.infer<typeof googleAnalyticsReportSchema>;

export class GoogleAnalyticsValidator {
  validateReport(input: GoogleAnalyticsReportInput) {
    const parsed = googleAnalyticsReportSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
    }
    return parsed.data;
  }

  validateAccessToken(token: string) {
    if (!token || token.trim().length < 1) {
      throw new Error('Google Analytics access token is required');
    }
    return token;
  }
}
