import { z } from 'zod';

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
