import { z } from 'zod';

export const searchConsoleQuerySchema = z.object({
  startDate: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  endDate: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  comparisonStartDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  comparisonEndDate: z.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  country: z.string().length(2).optional(),
  device: z.enum(['DESKTOP', 'MOBILE', 'TABLET']).optional(),
  searchType: z.enum(['web', 'image', 'video', 'news']).optional(),
  sort: z.enum(['clicks', 'impressions', 'ctr', 'position']).optional(),
  regex: z.object({
    query: z.string().optional(),
    page: z.string().optional(),
  }).optional(),
});

export type SearchConsoleQueryInput = z.infer<typeof searchConsoleQuerySchema>;

export class SearchConsoleValidator {
  validateRequest(input: SearchConsoleQueryInput) {
    const parsed = searchConsoleQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
    }
    return parsed.data;
  }

  validateAccessToken(token: string) {
    if (!token || token.trim().length < 1) {
      throw new Error('Search Console access token is required');
    }
    return token;
  }
}
