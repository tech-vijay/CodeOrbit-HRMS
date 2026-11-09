import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  addDocumentSchema,
  addEmergencyContactSchema,
  updateOnboardingTaskSchema,
  queryEmployeesSchema,
  updateMyProfileSchema,
} from './employee.schemas';

const router = Router();

// All employee routes enforce authentication and strict tenant boundary
router.use(authenticate);
router.use(resolveTenantContext);

router.get('/me', EmployeeController.getMyProfile);
router.patch(
  '/me',
  validateRequest({ body: updateMyProfileSchema }),
  EmployeeController.updateMyProfile
);

// Export dataset
router.get('/export', requirePermission('employee:export'), EmployeeController.exportEmployees);

// Employee CRUD
router.post(
  '/',
  requirePermission('employee:create'),
  validateRequest({ body: createEmployeeSchema }),
  EmployeeController.createEmployee
);

router.get(
  '/',
  requirePermission('employee:read'),
  validateRequest({ query: queryEmployeesSchema }),
  EmployeeController.getEmployees
);

router.get('/:id', requirePermission('employee:read'), EmployeeController.getEmployeeById);

router.patch(
  '/:id',
  requirePermission('employee:update'),
  validateRequest({ body: updateEmployeeSchema }),
  EmployeeController.updateEmployee
);

// Employee Documents
router.post(
  '/:id/documents',
  requirePermission('employee:document_manage'),
  validateRequest({ body: addDocumentSchema }),
  EmployeeController.addDocument
);

// Onboarding Task Checklist
router.patch(
  '/:id/onboarding-tasks/:taskId',
  requirePermission('employee:onboard'),
  validateRequest({ body: updateOnboardingTaskSchema }),
  EmployeeController.updateOnboardingTask
);

// Emergency Contacts
router.post(
  '/:id/emergency-contacts',
  requirePermission('employee:update'),
  validateRequest({ body: addEmergencyContactSchema }),
  EmployeeController.addEmergencyContact
);

export const employeeRouter = router;
