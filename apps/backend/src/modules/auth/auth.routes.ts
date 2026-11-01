import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  registerOrganizationSchema,
  loginSchema,
  switchOrganizationSchema,
} from './auth.schemas';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.post(
  '/register-organization',
  validateRequest({ body: registerOrganizationSchema }),
  AuthController.registerOrganization
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  AuthController.login
);

router.post('/refresh', AuthController.refresh);

router.post(
  '/switch-organization',
  authenticate,
  validateRequest({ body: switchOrganizationSchema }),
  AuthController.switchOrganization
);

router.post('/logout', AuthController.logout);

router.get('/me', authenticate, AuthController.me);

export const authRouter = router;
