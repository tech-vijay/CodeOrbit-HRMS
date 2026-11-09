import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  registerOrganizationSchema,
  loginSchema,
  switchOrganizationSchema,
  acceptInvitationSchema,
  changePasswordSchema,
} from './auth.schemas';
import { authenticate, authenticateIfPresent } from '../../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const invitationAcceptanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

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
  '/accept-invitation',
  invitationAcceptanceLimiter,
  authenticateIfPresent,
  validateRequest({ body: acceptInvitationSchema }),
  AuthController.acceptInvitation
);

router.post(
  '/change-password',
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  AuthController.changePassword
);

router.post(
  '/switch-organization',
  authenticate,
  validateRequest({ body: switchOrganizationSchema }),
  AuthController.switchOrganization
);

router.post('/logout', AuthController.logout);

router.get('/me', authenticate, AuthController.me);

export const authRouter = router;
