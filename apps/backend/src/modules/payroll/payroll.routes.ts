import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { PayrollController } from './payroll.controller';

const router = Router();

// Enforce authentication & tenant isolation across all payroll endpoints
router.use(authenticate, resolveTenantContext);

// 1. Statutory Salary Breakdown Preview (Helper for Admins)
router.post(
  '/preview-structure',
  requirePermission('payroll:process'),
  PayrollController.previewSalaryBreakdown
);

// 2. Employee Salary Structure Configuration
router.post(
  '/salary-structures',
  requirePermission('payroll:process'),
  PayrollController.setSalaryStructure
);

router.get(
  '/salary-structures/:employeeId',
  requirePermission('payroll:read'),
  PayrollController.getSalaryStructure
);

// 3. Executive Payroll Summary & KPIs
router.get(
  '/summary',
  requirePermission('payroll:process'),
  PayrollController.getPayrollSummary
);

// 4. Payroll Runs
router.post(
  '/runs',
  requirePermission('payroll:process'),
  PayrollController.processPayrollRun
);

router.get(
  '/runs',
  requirePermission('payroll:process'),
  PayrollController.listPayrollRuns
);

router.get(
  '/runs/:id',
  requirePermission('payroll:process'),
  PayrollController.getPayrollRunById
);

router.patch(
  '/runs/:id/status',
  requirePermission('payroll:approve'),
  PayrollController.updatePayrollStatus
);

router.post(
  '/runs/:id/disburse',
  requirePermission('payroll:approve'),
  PayrollController.markPayrollPaid
);

// 5. Payslips
router.get(
  '/payslips',
  requirePermission('payroll:read'),
  PayrollController.listPayslips
);

router.get(
  '/payslips/:id',
  requirePermission('payroll:read'),
  PayrollController.getPayslipById
);

export const payrollRouter = router;
