import { Request, Response } from 'express';
import { createUserSchema } from '../schemas/user.js';
import { databaseService } from '../services/databaseService.js';
import { logger } from '../lib/logger.js';

export class UserController {
  async create(req: Request, res: Response) {
    try {
      const parsed = createUserSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const user = await databaseService.userRepository.create(parsed.data);
      return res.status(201).json(user);
    } catch (error) {
      logger.error('Failed to create user via controller', error);
      return res.status(500).json({ error: 'Unable to create user' });
    }
  }

  async list(_req: Request, res: Response) {
    try {
      const users = await databaseService.userRepository.findAll();
      return res.json(users);
    } catch (error) {
      logger.error('Failed to fetch users via controller', error);
      return res.status(500).json({ error: 'Unable to fetch users' });
    }
  }
}

export const userController = new UserController();
