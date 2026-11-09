import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { UploadController } from './upload.controller';
import { authenticate, authenticateIfPresent } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requireAnyPermission } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { publicResumeSchema, uploadFileSchema } from './upload.schemas';

export const uploadRouter = Router();
export const legacyUploadRouter = Router();

const publicResumeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many resume uploads. Please try again later.' },
});

uploadRouter.post(
  '/public/resume',
  publicResumeLimiter,
  validateRequest({ body: publicResumeSchema }),
  UploadController.uploadPublicResume
);

uploadRouter.post(
  '/',
  authenticate,
  resolveTenantContext,
  requireAnyPermission(
    'employee:document_manage',
    'expense:apply',
    'recruitment:review_candidates'
  ),
  validateRequest({ body: uploadFileSchema }),
  UploadController.uploadFile
);

uploadRouter.get(
  '/files/:folder/:fileName',
  authenticate,
  resolveTenantContext,
  UploadController.getTenantFile
);

legacyUploadRouter.get(
  '/:folder/:fileName',
  authenticate,
  resolveTenantContext,
  UploadController.getTenantFile
);
