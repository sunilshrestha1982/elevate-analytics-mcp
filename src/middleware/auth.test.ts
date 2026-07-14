import jwt from 'jsonwebtoken';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireAuth, requireGoogleAccount, requireSameSiteOrigin } from './auth.js';

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('auth middleware', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', '12345678901234567890123456789012');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects requests without a token', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAuth({ cookies: {} } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing google account on protected route', () => {
    const res = mockRes();
    const next = vi.fn();
    requireGoogleAccount({ user: { sub: 1, email: 'a@example.com' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows same-site origin', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : 'http://localhost:3000') } as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects cross-origin requests', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : 'https://evil.example') } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a referer-based same-site request', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : null) } as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid origin values', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : 'not-a-url') } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests with no origin or referer metadata', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ protocol: 'http', get: () => null } as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts a valid JWT for authenticated routes', () => {
    const res = mockRes();
    const next = vi.fn();
    const token = jwt.sign({ sub: 1, email: 'a@example.com', googleUserId: 'google-user' }, '12345678901234567890123456789012', { algorithm: 'HS256', issuer: 'elevate-analytics-mcp', audience: 'elevate-analytics-mcp' });
    requireAuth({ cookies: { auth_token: token } } as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid tokens and missing secrets', () => {
    const res = mockRes();
    const next = vi.fn();
    vi.stubEnv('JWT_SECRET', '');
    requireAuth({ cookies: { auth_token: 'invalid' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
