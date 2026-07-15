import dotenv from 'dotenv';
import { z } from 'zod';
import { databaseUrlSchema } from './schemas.js';

dotenv.config();

const optionalStringSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalSecretSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(32).optional(),
);

const optionalApiKeySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(24).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_VERSION: z.string().default('0.1.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE_OVERRIDE: z.union([z.literal('true'), z.literal('false')]).transform((value) => value === 'true').optional(),
  TRUST_PROXY: z.union([z.literal('true'), z.literal('false')]).transform((value) => value === 'true').default('true'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(300),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  REDIS_URL: optionalStringSchema,
  OTEL_ENABLED: z.union([z.literal('true'), z.literal('false')]).transform((value) => value === 'true').default('false'),
  OTEL_SERVICE_NAME: optionalStringSchema,
  MCP_API_KEY: optionalApiKeySchema,
  METRICS_AUTH_TOKEN: optionalApiKeySchema,
  GCP_PROJECT_ID: optionalStringSchema,
  GCP_REGION: optionalStringSchema,
  GCP_SERVICE_NAME: optionalStringSchema,
  GOOGLE_CLOUD_RUN_URL: optionalStringSchema,
  GOOGLE_SECRET_PREFIX: optionalStringSchema,
  DATABASE_URL: databaseUrlSchema,
  GOOGLE_API_KEY: optionalStringSchema,
  GOOGLE_CLIENT_ID: optionalStringSchema,
  GOOGLE_CLIENT_SECRET: optionalStringSchema,
  GOOGLE_REDIRECT_URI: optionalStringSchema,
  JWT_SECRET: optionalSecretSchema,
  SESSION_SECRET: optionalSecretSchema,
  ENCRYPTION_KEY: optionalSecretSchema,
});

export const env = envSchema.parse(process.env);

export const getEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  return parsed.data;
};

export const validateRequiredEnvOnStartup = () => {
  const parsed = getEnv();

  const requiredInAllEnvs = ['DATABASE_URL'] as const;
  const requiredInProduction = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'MCP_API_KEY',
    'GCP_PROJECT_ID',
    'GCP_REGION',
    'GCP_SERVICE_NAME',
  ] as const;

  const missing: string[] = [];
  for (const key of requiredInAllEnvs) {
    if (!parsed[key]) missing.push(key);
  }
  if (parsed.NODE_ENV === 'production' || parsed.NODE_ENV === 'staging') {
    for (const key of requiredInProduction) {
      if (!parsed[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return parsed;
};
