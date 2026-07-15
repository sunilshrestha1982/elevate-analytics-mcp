import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { databaseService } from './databaseService.js';
import { getEnv } from '../config/env.js';
import { createChildLogger } from '../lib/logger.js';
import { encryptValue, decryptValue } from '../lib/encryption.js';
import { oauthCallbackSchema } from '../schemas/oauth.js';
import { traceAsync } from '../lib/tracing.js';

const logger = createChildLogger({ scope: 'oauth-service' });

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const createAuthCookieOptions = () => {
  const secure = getEnv().COOKIE_SECURE_OVERRIDE ?? (getEnv().NODE_ENV !== 'development' || getEnv().COOKIE_SAMESITE === 'none');
  return {
    httpOnly: true,
    secure,
    sameSite: getEnv().COOKIE_SAMESITE,
    path: '/',
    maxAge: 60 * 60 * 1000,
  };
};

export class OAuthService {
  async login(req: Request, res: Response) {
    return traceAsync('oauth', 'oauth.login', {}, async () => {
      const config = getEnv();

      if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
      }

      if (!config.JWT_SECRET || !config.SESSION_SECRET || !config.ENCRYPTION_KEY) {
        logger.error('OAuth init failed because required secrets are missing');
        return res.status(500).json({ error: 'Authentication is not configured' });
      }

      const state = crypto.randomBytes(24).toString('hex');
      const codeVerifier = crypto.randomBytes(64).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await databaseService.oauthSessionRepository.create({
        state,
        codeVerifier,
        expiresAt,
      });

      const redirectUrl = new URL(GOOGLE_AUTH_URL);
      redirectUrl.searchParams.set('client_id', config.GOOGLE_CLIENT_ID);
      redirectUrl.searchParams.set('redirect_uri', config.GOOGLE_REDIRECT_URI);
      redirectUrl.searchParams.set('response_type', 'code');
      redirectUrl.searchParams.set('scope', [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/analytics.readonly',
      ].join(' '));
      redirectUrl.searchParams.set('access_type', 'offline');
      redirectUrl.searchParams.set('prompt', 'consent');
      redirectUrl.searchParams.set('state', state);
      redirectUrl.searchParams.set('code_challenge', codeChallenge);
      redirectUrl.searchParams.set('code_challenge_method', 'S256');

      res.redirect(redirectUrl.toString());
    });
  }

  async callback(req: Request, res: Response) {
    return traceAsync('oauth', 'oauth.callback', {}, async () => {
      try {
        const parsed = oauthCallbackSchema.safeParse(req.query);
        if (!parsed.success) {
          return res.status(400).json({ error: 'Invalid OAuth callback parameters' });
        }

      const { code, state } = parsed.data;
      const session = await databaseService.oauthSessionRepository.consumeByState(state);
      if (!session || session.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired OAuth state' });
      }

      const config = getEnv();

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.GOOGLE_CLIENT_ID ?? '',
          client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
          redirect_uri: config.GOOGLE_REDIRECT_URI ?? '',
          grant_type: 'authorization_code',
          code_verifier: session.codeVerifier ?? '',
        }),
      });

      if (!tokenResponse.ok) {
        logger.warn('Google token exchange failed', { status: tokenResponse.status });
        return res.status(502).json({ error: 'Authentication provider error' });
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };

      if (!tokenData.access_token) {
        return res.status(502).json({ error: 'Authentication provider error' });
      }

      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      if (!userInfoResponse.ok) {
        logger.warn('Google profile lookup failed', { status: userInfoResponse.status });
        return res.status(502).json({ error: 'Authentication provider error' });
      }

      const profile = (await userInfoResponse.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      const googleUserId = profile.sub;
      const googleEmail = profile.email;
      if (!googleUserId || !googleEmail) {
        return res.status(502).json({ error: 'Authentication provider error' });
      }

      const existing = await databaseService.googleAccountRepository.findByGoogleUserId(googleUserId);
      const user = existing?.userId
        ? await databaseService.userRepository.findById(existing.userId)
        : null;

      const persistedUser = user ?? (await databaseService.userRepository.create({
        email: googleEmail,
        name: profile.name,
        avatar: profile.picture,
      }));

      const expiryDate = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000);
      const encryptedRefreshToken = tokenData.refresh_token ? encryptValue(tokenData.refresh_token) : undefined;
      const refreshTokenValue = encryptedRefreshToken ?? existing?.refreshToken ?? null;
      const accessTokenValue = encryptValue(tokenData.access_token);

      if (existing) {
        await databaseService.googleAccountRepository.updateAccount(existing.id, {
          user: { connect: { id: persistedUser.id } },
          googleUserId,
          email: googleEmail,
          refreshToken: refreshTokenValue,
          accessToken: accessTokenValue,
          expiryDate,
        });
      } else {
        await databaseService.googleAccountRepository.create({
          user: { connect: { id: persistedUser.id } },
          googleUserId,
          email: googleEmail,
          refreshToken: refreshTokenValue,
          accessToken: accessTokenValue,
          expiryDate,
        });
      }

      const jwtPayload = { sub: persistedUser.id, email: persistedUser.email, googleUserId };
      const token = jwt.sign(jwtPayload, config.JWT_SECRET as string, {
        algorithm: 'HS256',
        expiresIn: '1h',
        issuer: 'elevate-analytics-mcp',
        audience: 'elevate-analytics-mcp',
        jwtid: crypto.randomUUID(),
      });

      res.cookie('auth_token', token, createAuthCookieOptions());
        logger.info('OAuth login succeeded', { userId: persistedUser.id, googleUserId });
        return res.redirect('/');
      } catch (error) {
        logger.error('OAuth callback failed', error);
        return res.status(500).json({ error: 'Authentication failed' });
      }
    });
  }

  async refreshToken(googleAccountId: number) {
    return traceAsync('oauth', 'oauth.refresh_token', { googleAccountId }, async () => {
      const account = await databaseService.googleAccountRepository.findById(googleAccountId);
      if (!account?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const config = getEnv();
      const refreshToken = decryptValue(account.refreshToken);
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.GOOGLE_CLIENT_ID ?? '',
          client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh Google access token');
      }

      const tokenData = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
      if (!tokenData.access_token) {
        throw new Error('No access token returned from Google refresh');
      }

      const expiryDate = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000);
      await databaseService.googleAccountRepository.updateAccessToken(googleAccountId, encryptValue(tokenData.access_token), expiryDate);
      return { accessToken: tokenData.access_token, expiryDate };
    });
  }

  async disconnect(userId: number, googleAccountId: number) {
    return traceAsync('oauth', 'oauth.disconnect', { userId, googleAccountId }, async () => {
      const account = await databaseService.googleAccountRepository.findById(googleAccountId);
      if (!account || account.userId !== userId) {
        throw new Error('Google account not found');
      }

      await databaseService.googleAccountRepository.delete(googleAccountId);
      return { success: true };
    });
  }

  async logout(_req: Request, res: Response) {
    return traceAsync('oauth', 'oauth.logout', {}, async () => {
      res.clearCookie('auth_token', { ...createAuthCookieOptions(), maxAge: 0 });
      logger.info('OAuth logout succeeded');
      return res.json({ success: true });
    });
  }
}

export const oauthService = new OAuthService();
