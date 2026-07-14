import { describe, expect, it } from 'vitest';
import { databaseUrlSchema } from './schemas.js';

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
