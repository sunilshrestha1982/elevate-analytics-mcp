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
    requireSameSiteOrigin({ method: 'POST', protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:8080' : 'http://localhost:8080') } as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects cross-origin requests', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ method: 'POST', protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:8080' : 'https://evil.example') } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing origin metadata for non-safe methods in production', () => {
    const res = mockRes();
    const next = vi.fn();
    vi.stubEnv('NODE_ENV', 'production');
    requireSameSiteOrigin({ method: 'POST', protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:8080' : null) } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid origin values', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ method: 'POST', protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:8080' : 'not-a-url') } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows safe methods with no origin metadata', () => {
    const res = mockRes();
    const next = vi.fn();
    requireSameSiteOrigin({ method: 'GET', protocol: 'http', get: () => null } as any, res as any, next);
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
