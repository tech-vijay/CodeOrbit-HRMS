import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  updateOrganizationSchema,
  createDepartmentSchema,
  createDesignationSchema,
  inviteMemberSchema,
} from './organization.schemas';

const router = Router();

// All organization routes require valid authentication and verified tenant membership
router.use(authenticate);
router.use(resolveTenantContext);

// Organization Profile
router.get('/profile', requirePermission('org:read'), OrganizationController.getProfile);
router.patch(
  '/profile',
  requirePermission('org:update'),
  validateRequest({ body: updateOrganizationSchema }),
  OrganizationController.updateProfile
);

// Roles
router.get('/roles', requirePermission('org:update'), OrganizationController.getRoles);

// Departments
router.get('/departments', requirePermission('org:read'), OrganizationController.getDepartments);
router.post(
  '/departments',
  requirePermission('org:update'),
  validateRequest({ body: createDepartmentSchema }),
  OrganizationController.createDepartment
);

// Designations
router.get('/designations', requirePermission('org:read'), OrganizationController.getDesignations);
router.post(
  '/designations',
  requirePermission('org:update'),
  validateRequest({ body: createDesignationSchema }),
  OrganizationController.createDesignation
);

// Members & Staff
router.get('/members', requirePermission('employee:read'), OrganizationController.getMembers);
router.post(
  '/members/invite',
  requirePermission('employee:create'),
  validateRequest({ body: inviteMemberSchema }),
  OrganizationController.inviteMember
);

// Audit Logs
router.get('/audit-logs', requirePermission('audit:read'), OrganizationController.getAuditLogs);

export const organizationRouter = router;
