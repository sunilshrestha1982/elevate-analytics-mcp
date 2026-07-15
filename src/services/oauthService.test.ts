import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { oauthService } from './oauthService.js';
import { databaseService } from './databaseService.js';
import { encryptValue } from '../lib/encryption.js';

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides: Record<string, any> = {}) => ({
  query: {},
  body: {},
  cookies: {},
  ...overrides,
});

describe('OAuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost:8080/oauth/google/callback');
    vi.stubEnv('JWT_SECRET', '12345678901234567890123456789012');
    vi.stubEnv('SESSION_SECRET', '12345678901234567890123456789012');
    vi.stubEnv('ENCRYPTION_KEY', '12345678901234567890123456789012');
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('redirects to Google for login', async () => {
    const res = mockRes();
    const createSpy = vi.spyOn(databaseService.oauthSessionRepository, 'create').mockResolvedValue({
      id: 1,
      state: 'state',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await oauthService.login(mockReq() as any, res);

    expect(createSpy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  it('handles callback successfully', async () => {
    const res = mockRes();
    const session = {
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue(session as any);
    vi.spyOn(databaseService.googleAccountRepository, 'findByGoogleUserId').mockResolvedValue(null);
    vi.spyOn(databaseService.userRepository, 'create').mockResolvedValue({ id: 10, email: 'user@example.com' } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }),
    } as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sub: 'google-user', email: 'user@example.com', name: 'User', picture: 'https://example.com/u.png' }),
    } as any);
    vi.spyOn(databaseService.googleAccountRepository, 'create').mockResolvedValue({ id: 5 } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.cookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('rejects invalid state', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue(null);

    await oauthService.callback({ query: { code: 'auth-code', state: 'bad' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired OAuth state' });
  });

  it('rejects expired state', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue({
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired OAuth state' });
  });

  it('rejects invalid PKCE', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue({
      id: 1,
      state: 'abc',
      codeVerifier: null,
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 400 } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication provider error' });
  });

  it('returns a server error when OAuth config is missing', async () => {
    const res = mockRes();
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('GOOGLE_REDIRECT_URI', '');

    await oauthService.login(mockReq() as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Google OAuth is not configured' });
  });

  it('returns a server error when required secrets are missing', async () => {
    const res = mockRes();
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('ENCRYPTION_KEY', '');

    await oauthService.login(mockReq() as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication is not configured' });
  });

  it('rejects invalid callback parameters', async () => {
    const res = mockRes();

    await oauthService.callback({ query: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid OAuth callback parameters' });
  });

  it('returns an auth error when token data is missing', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue({
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: '' }) } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication provider error' });
  });

  it('returns an auth error when profile lookup fails', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue({
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access' }) } as any).mockResolvedValueOnce({ ok: false, status: 500 } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication provider error' });
  });

  it('returns an auth error when profile data is incomplete', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue({
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access' }) } as any).mockResolvedValueOnce({ ok: true, json: async () => ({ email: 'user@example.com' }) } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication provider error' });
  });

  it('returns a generic error when callback processing throws', async () => {
    const res = mockRes();
    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockRejectedValue(new Error('boom'));

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
  });

  it('reuses the existing Google account and stored tokens when present', async () => {
    const res = mockRes();
    const session = {
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue(session as any);
    vi.spyOn(databaseService.googleAccountRepository, 'findByGoogleUserId').mockResolvedValue({
      id: 9,
      userId: 11,
      refreshToken: 'stored-refresh',
      accessToken: 'stored-access',
    } as any);
    vi.spyOn(databaseService.userRepository, 'findById').mockResolvedValue({ id: 11, email: 'existing@example.com' } as any);
    vi.spyOn(databaseService.googleAccountRepository, 'updateAccount').mockResolvedValue({ id: 9 } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access', expires_in: 3600 }) } as any).mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'google-user-2', email: 'existing@example.com', name: 'Existing', picture: 'https://example.com/existing.png' }) } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(databaseService.googleAccountRepository.updateAccount).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('falls back to null values when no stored tokens exist', async () => {
    const res = mockRes();
    const session = {
      id: 1,
      state: 'abc',
      codeVerifier: 'verifier',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(databaseService.oauthSessionRepository, 'consumeByState').mockResolvedValue(session as any);
    vi.spyOn(databaseService.googleAccountRepository, 'findByGoogleUserId').mockResolvedValue({
      id: 9,
      userId: 11,
      refreshToken: null,
      accessToken: null,
    } as any);
    vi.spyOn(databaseService.userRepository, 'findById').mockResolvedValue({ id: 11, email: 'existing@example.com' } as any);
    vi.spyOn(databaseService.googleAccountRepository, 'updateAccount').mockResolvedValue({ id: 9 } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access' }) } as any).mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'google-user-3', email: 'existing@example.com', name: 'Existing', picture: 'https://example.com/existing.png' }) } as any);

    await oauthService.callback({ query: { code: 'auth-code', state: 'abc' } } as any, res);

    expect(databaseService.googleAccountRepository.updateAccount).toHaveBeenCalledWith(9, expect.objectContaining({
      refreshToken: null,
    }));
  });

  it('refreshes token successfully', async () => {
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({
      id: 2,
      refreshToken: encryptValue('refresh-token'),
      userId: 5,
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-access', expires_in: 1800 }),
    } as any);
    vi.spyOn(databaseService.googleAccountRepository, 'updateAccessToken').mockResolvedValue({ id: 2 } as any);

    const result = await oauthService.refreshToken(2);

    expect(result.accessToken).toBe('new-access');
  });

  it('logs out cleanly', async () => {
    const res = mockRes();
    await oauthService.logout(mockReq() as any, res);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('throws when no refresh token exists', async () => {
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({ id: 2, userId: 5 } as any);

    await expect(oauthService.refreshToken(2)).rejects.toThrow('No refresh token available');
  });

  it('uses empty client values and the default expiry when refresh env values are missing', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({
      id: 2,
      refreshToken: encryptValue('refresh-token'),
      userId: 5,
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ access_token: 'new-access' }) } as any);
    vi.spyOn(databaseService.googleAccountRepository, 'updateAccessToken').mockResolvedValue({ id: 2 } as any);

    const result = await oauthService.refreshToken(2);

    expect(result.accessToken).toBe('new-access');
    expect(result.expiryDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('throws when refresh token exchange fails', async () => {
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({
      id: 2,
      refreshToken: encryptValue('refresh-token'),
      userId: 5,
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401 } as any);

    await expect(oauthService.refreshToken(2)).rejects.toThrow('Failed to refresh Google access token');
  });

  it('throws when refresh returns no access token', async () => {
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({
      id: 2,
      refreshToken: encryptValue('refresh-token'),
      userId: 5,
    } as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) } as any);

    await expect(oauthService.refreshToken(2)).rejects.toThrow('No access token returned from Google refresh');
  });

  it('disconnects a Google account for the user', async () => {
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({ id: 4, userId: 8 } as any);
    vi.spyOn(databaseService.googleAccountRepository, 'delete').mockResolvedValue({ id: 4 } as any);

    const result = await oauthService.disconnect(8, 4);

    expect(result).toEqual({ success: true });
  });

  it('throws when disconnecting an account that does not belong to the user', async () => {
    vi.spyOn(databaseService.googleAccountRepository, 'findById').mockResolvedValue({ id: 4, userId: 7 } as any);

    await expect(oauthService.disconnect(8, 4)).rejects.toThrow('Google account not found');
  });
});
