import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  clockInSchema,
  clockOutSchema,
  startBreakSchema,
  endBreakSchema,
  regularizationRequestSchema,
  reviewRegularizationSchema,
  queryAttendanceSchema,
  createShiftSchema,
} from './attendance.schemas';

const router = Router();

// Enforce authentication & tenant boundary across all attendance routes
router.use(authenticate);
router.use(resolveTenantContext);

// 1. Live Self-Service Actions (Clock In, Out, Breaks)
router.post(
  '/clock-in',
  requirePermission('attendance:checkin'),
  validateRequest({ body: clockInSchema }),
  AttendanceController.clockIn
);

router.post(
  '/clock-out',
  requirePermission('attendance:checkin'),
  validateRequest({ body: clockOutSchema }),
  AttendanceController.clockOut
);

router.post(
  ['/breaks/start', '/break/start'],
  requirePermission('attendance:checkin'),
  validateRequest({ body: startBreakSchema }),
  AttendanceController.startBreak
);

router.post(
  ['/breaks/end', '/break/end'],
  requirePermission('attendance:checkin'),
  validateRequest({ body: endBreakSchema }),
  AttendanceController.endBreak
);

router.get('/today', requirePermission('attendance:checkin'), AttendanceController.getTodayStatus);

// 2. Attendance Records & Directory Querying
router.get(
  '/',
  requirePermission('attendance:read'),
  validateRequest({ query: queryAttendanceSchema }),
  AttendanceController.getAttendanceRecords
);

router.get('/summary', requirePermission('attendance:read'), AttendanceController.getSummary);

router.get('/export', requirePermission('attendance:read'), AttendanceController.exportCSV);

// 3. Regularization Workflow
router.post(
  '/regularize',
  requirePermission('attendance:checkin'),
  validateRequest({ body: regularizationRequestSchema }),
  AttendanceController.requestRegularization
);

router.get(
  ['/regularizations', '/regularize'],
  requirePermission('attendance:read'),
  AttendanceController.getRegularizations
);

router.patch(
  ['/regularizations/:id/review', '/regularizations/:id', '/regularize/:id'],
  requirePermission('attendance:approve'),
  validateRequest({ body: reviewRegularizationSchema }),
  AttendanceController.reviewRegularization
);

// 4. Shifts Configuration
router.get('/shifts', requirePermission('attendance:read'), AttendanceController.getShifts);

router.post(
  '/shifts',
  requirePermission('attendance:update'),
  validateRequest({ body: createShiftSchema }),
  AttendanceController.createShift
);

export const attendanceRouter = router;
