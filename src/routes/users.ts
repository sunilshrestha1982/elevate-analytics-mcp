import { Router } from 'express';
import { userController } from '../controllers/userController.js';

export const userRouter = Router();

userRouter.post('/', userController.create.bind(userController));
userRouter.get('/', userController.list.bind(userController));
