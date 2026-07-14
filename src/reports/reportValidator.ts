import { z } from 'zod';
import type { ReportRequest } from './types.js';

const reportTypeSchema = z.enum([
  'weekly-seo-report',
  'monthly-seo-report',
  'quarterly-seo-report',
  'technical-seo-audit',
  'content-audit',
  'landing-page-audit',
  'keyword-opportunity-report',
  'traffic-loss-report',
  'traffic-growth-report',
  'website-health-report',
  'competitor-comparison',
  'executive-dashboard',
]);

const dateLike = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const requestSchema = z.object({
  userId: z.number().int().positive(),
  reportType: reportTypeSchema,
  siteUrl: z.string().url().optional(),
  propertyId: z.string().optional(),
  url: z.string().url().optional(),
  startDate: dateLike.optional(),
  endDate: dateLike.optional(),
  comparisonStartDate: dateLike.optional(),
  comparisonEndDate: dateLike.optional(),
});

export class ReportValidator {
  validate(input: ReportRequest): ReportRequest {
    const parsed = requestSchema.parse(input);
    if (parsed.startDate && parsed.endDate && parsed.startDate > parsed.endDate) {
      throw new Error('startDate must be before or equal to endDate');
    }
    if (parsed.comparisonStartDate && parsed.comparisonEndDate && parsed.comparisonStartDate > parsed.comparisonEndDate) {
      throw new Error('comparisonStartDate must be before or equal to comparisonEndDate');
    }
    return parsed;
  }
}
