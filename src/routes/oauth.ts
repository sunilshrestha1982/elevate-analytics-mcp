import { Router } from 'express';
import { oauthService } from '../services/oauthService.js';
import { AuthenticatedRequest, requireAuth, requireGoogleAccount, requireSameSiteOrigin } from '../middleware/auth.js';

export const oauthRouter = Router();

oauthRouter.get('/google/login', (req, res) => oauthService.login(req, res));
oauthRouter.get('/google/callback', (req, res) => oauthService.callback(req, res));
oauthRouter.post('/logout', requireSameSiteOrigin, (req, res) => oauthService.logout(req, res));
oauthRouter.post('/disconnect', requireAuth, requireSameSiteOrigin, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const googleAccountId = Number(req.body?.googleAccountId);
    if (!userId || !googleAccountId) {
      return res.status(400).json({ error: 'Missing account identifier' });
    }
    const result = await oauthService.disconnect(userId, googleAccountId);
    return res.json(result);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
});

oauthRouter.get('/me', requireAuth, requireGoogleAccount, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});
