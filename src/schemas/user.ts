import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
