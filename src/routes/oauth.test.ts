import jwt from 'jsonwebtoken';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { oauthRouter } from './oauth.js';
import { oauthService } from '../services/oauthService.js';

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

describe('oauth routes', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', '12345678901234567890123456789012');
  });

  it('routes login requests to oauth service', () => {
    const loginSpy = vi.spyOn(oauthService, 'login').mockResolvedValue(undefined);
    const req: any = { method: 'GET', url: '/google/login' };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());

    expect(loginSpy).toHaveBeenCalled();
  });

  it('routes logout requests through the service', async () => {
    const logoutSpy = vi.spyOn(oauthService, 'logout').mockResolvedValue(undefined as never);
    const req: any = { method: 'POST', url: '/logout', body: {}, protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : undefined) };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());
    await Promise.resolve();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('routes callback requests through the service', async () => {
    const callbackSpy = vi.spyOn(oauthService, 'callback').mockResolvedValue(undefined);
    const req: any = { method: 'GET', url: '/google/callback', query: { code: 'abc', state: 'xyz' } };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());
    await Promise.resolve();

    expect(callbackSpy).toHaveBeenCalled();
  });

  it('handles disconnect requests with a user id', async () => {
    const disconnectSpy = vi.spyOn(oauthService, 'disconnect').mockResolvedValue({ success: true } as any);
    const token = jwt.sign({ sub: 1, email: 'a@example.com' }, '12345678901234567890123456789012', { algorithm: 'HS256', issuer: 'elevate-analytics-mcp', audience: 'elevate-analytics-mcp' });
    const req: any = { method: 'POST', url: '/disconnect', body: { googleAccountId: '4' }, cookies: { auth_token: token }, protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : undefined) };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());
    await Promise.resolve();

    expect(disconnectSpy).toHaveBeenCalledWith(1, 4);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('rejects disconnect requests missing account identifiers', async () => {
    const token = jwt.sign({ sub: 1, email: 'a@example.com' }, '12345678901234567890123456789012', { algorithm: 'HS256', issuer: 'elevate-analytics-mcp', audience: 'elevate-analytics-mcp' });
    const req: any = { method: 'POST', url: '/disconnect', body: {}, cookies: { auth_token: token }, protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : undefined) };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());
    await Promise.resolve();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing account identifier' });
  });

  it('returns the authenticated user profile', async () => {
    const token = jwt.sign({ sub: 1, email: 'a@example.com', googleUserId: 'google-user' }, '12345678901234567890123456789012', { algorithm: 'HS256', issuer: 'elevate-analytics-mcp', audience: 'elevate-analytics-mcp' });
    const req: any = { method: 'GET', url: '/me', cookies: { auth_token: token }, user: { sub: 1, email: 'a@example.com', googleUserId: 'google-user' } };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());
    await Promise.resolve();

    expect(res.json).toHaveBeenCalledWith({ user: req.user });
  });

  it('returns a 500 error when disconnecting fails', async () => {
    vi.spyOn(oauthService, 'disconnect').mockRejectedValue(new Error('boom'));
    const token = jwt.sign({ sub: 1, email: 'a@example.com' }, '12345678901234567890123456789012', { algorithm: 'HS256', issuer: 'elevate-analytics-mcp', audience: 'elevate-analytics-mcp' });
    const req: any = { method: 'POST', url: '/disconnect', body: { googleAccountId: '4' }, cookies: { auth_token: token }, protocol: 'http', get: (name: string) => (name === 'host' ? 'localhost:3000' : undefined) };
    const res = mockRes();

    (oauthRouter as any).handle(req, res, vi.fn());
    await Promise.resolve();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to disconnect Google account' });
  });
});
