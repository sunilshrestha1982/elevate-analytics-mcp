import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { requireAuth, requireSameSiteOrigin } from '../middleware/auth.js';

export const userRouter = Router();

userRouter.post('/', requireAuth, requireSameSiteOrigin, userController.create.bind(userController));
userRouter.get('/', requireAuth, userController.list.bind(userController));
