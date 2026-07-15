import { beforeEach, describe, expect, it } from 'vitest';
import { getEnv, validateRequiredEnvOnStartup } from './env.js';
import { databaseUrlSchema } from './schemas.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('DATABASE_URL schema', () => {
  it('accepts postgres:// URLs', () => {
    const parsed = databaseUrlSchema.parse('postgres://user:pass@localhost:5432/db');
    expect(parsed).toBe('postgres://user:pass@localhost:5432/db');
  });

  it('accepts postgresql:// URLs', () => {
    const parsed = databaseUrlSchema.parse('postgresql://user:pass@localhost:5432/db');
    expect(parsed).toBe('postgresql://user:pass@localhost:5432/db');
  });

  it('rejects empty values', () => {
    expect(() => databaseUrlSchema.parse('')).toThrow('DATABASE_URL must not be empty');
    expect(() => databaseUrlSchema.parse('   ')).toThrow('DATABASE_URL must not be empty');
  });

  it('rejects non-postgres schemes', () => {
    expect(() => databaseUrlSchema.parse('mysql://localhost:3306/db')).toThrow(
      'DATABASE_URL must start with postgres:// or postgresql://',
    );
    expect(() => databaseUrlSchema.parse('http://localhost:5432/db')).toThrow(
      'DATABASE_URL must start with postgres:// or postgresql://',
    );
  });
});

describe('environment loading', () => {
  it('allows DATABASE_URL to be omitted in test mode', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;

    expect(() => getEnv()).not.toThrow();
    expect(() => validateRequiredEnvOnStartup()).not.toThrow();
  });

  it('requires DATABASE_URL in production mode', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.SESSION_SECRET = 'b'.repeat(32);
    process.env.ENCRYPTION_KEY = 'c'.repeat(32);
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://example.com/oauth/callback';
    process.env.MCP_API_KEY = 'd'.repeat(24);
    process.env.GCP_PROJECT_ID = 'project-id';
    process.env.GCP_REGION = 'us-central1';
    process.env.GCP_SERVICE_NAME = 'service-name';

    expect(() => validateRequiredEnvOnStartup()).toThrow('DATABASE_URL');
  });
});
