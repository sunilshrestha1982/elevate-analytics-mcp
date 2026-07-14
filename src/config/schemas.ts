import { z } from 'zod';

export const databaseUrlSchema = z
  .string()
  .trim()
  .min(1, 'DATABASE_URL must not be empty')
  .refine(
    (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'DATABASE_URL must start with postgres:// or postgresql://',
  );
