import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authController } from './auth.controller';

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/refresh', authController.refresh);
  router.post('/logout', authController.logout);
  router.get('/me', authenticate, authController.me);

  return router;
}
