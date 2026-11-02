import { Router } from 'express';
import { LeaveController } from './leave.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  createLeaveTypeSchema,
  applyLeaveSchema,
  reviewLeaveSchema,
  cancelLeaveSchema,
  queryLeaveRequestsSchema,
  createHolidaySchema,
} from './leave.schemas';

const router = Router();

// Enforce authentication & tenant boundary
router.use(authenticate);
router.use(resolveTenantContext);

// 1. Leave Types
router.get('/types', requirePermission('leave:read'), LeaveController.getLeaveTypes);
router.post(
  '/types',
  requirePermission('leave:manage_balance'),
  validateRequest({ body: createLeaveTypeSchema }),
  LeaveController.createLeaveType
);

// 2. Balances
router.get('/balances', requirePermission('leave:read'), LeaveController.getLeaveBalances);

// 3. Leave Requests Workflow
router.post(
  '/apply',
  requirePermission('leave:apply'),
  validateRequest({ body: applyLeaveSchema }),
  LeaveController.applyLeave
);

router.get(
  '/requests',
  requirePermission('leave:read'),
  validateRequest({ query: queryLeaveRequestsSchema }),
  LeaveController.getLeaveRequests
);

router.patch(
  '/requests/:id/review',
  requirePermission('leave:approve'),
  validateRequest({ body: reviewLeaveSchema }),
  LeaveController.reviewLeaveRequest
);

router.patch(
  '/requests/:id/cancel',
  requirePermission('leave:apply'),
  validateRequest({ body: cancelLeaveSchema }),
  LeaveController.cancelLeaveRequest
);

// 4. Company Holidays
router.get('/holidays', requirePermission('leave:read'), LeaveController.getHolidays);
router.post(
  '/holidays',
  requirePermission('leave:manage_balance'),
  validateRequest({ body: createHolidaySchema }),
  LeaveController.createHoliday
);

// 5. Dashboard Summary
router.get('/summary', requirePermission('leave:read'), LeaveController.getLeaveSummary);

export const leaveRouter = router;
