import { Request, Response } from 'express';
import { oauthService } from '../services/oauthService.js';

export class OAuthController {
  async login(req: Request, res: Response) {
    await oauthService.login(req, res);
  }

  async callback(req: Request, res: Response) {
    await oauthService.callback(req, res);
  }

  async logout(req: Request, res: Response) {
    await oauthService.logout(req, res);
  }
}

export const oauthController = new OAuthController();
