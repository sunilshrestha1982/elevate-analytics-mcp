import { describe, expect, it } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from './security.js';

describe('security middleware origin handling', () => {
  it('parses comma-separated allowed origins', () => {
    expect(parseAllowedOrigins('https://app.example.com, https://admin.example.com ,')).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('ignores wildcard entries in allowed origins', () => {
    expect(parseAllowedOrigins('*,https://app.example.com')).toEqual(['https://app.example.com']);
  });

  it('allows configured origins in production', () => {
    const allowed = parseAllowedOrigins('https://app.example.com,https://admin.example.com');
    expect(isOriginAllowed('https://app.example.com', allowed, 'production')).toBe(true);
    expect(isOriginAllowed('https://unknown.example.com', allowed, 'production')).toBe(false);
  });

  it('allows localhost origins in development', () => {
    const allowed = parseAllowedOrigins('https://app.example.com');
    expect(isOriginAllowed('http://localhost:3000', allowed, 'development')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173', allowed, 'development')).toBe(true);
  });

  it('rejects localhost origins outside development', () => {
    const allowed = parseAllowedOrigins('https://app.example.com,http://localhost:3000');
    expect(isOriginAllowed('http://localhost:3000', allowed, 'production')).toBe(false);
  });

  it('allows requests without an origin header', () => {
    const allowed = parseAllowedOrigins('https://app.example.com');
    expect(isOriginAllowed(undefined, allowed, 'production')).toBe(true);
  });
});
