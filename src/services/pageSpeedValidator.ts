import { z } from 'zod';

export const pageSpeedRequestSchema = z.object({
  url: z.string().url(),
  strategy: z.enum(['mobile', 'desktop']).optional().default('mobile'),
});

export type PageSpeedRequestInput = z.infer<typeof pageSpeedRequestSchema>;

export class PageSpeedValidator {
  validateRequest(input: PageSpeedRequestInput) {
    const parsed = pageSpeedRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
    }
    return parsed.data;
  }
}
