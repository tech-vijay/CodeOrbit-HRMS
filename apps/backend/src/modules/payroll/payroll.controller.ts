import { Request, Response, NextFunction } from 'express';
import { PayrollService } from './payroll.service';
import {
  createSalaryStructureSchema,
  autoCalculateSalarySchema,
  runPayrollSchema,
  updatePayrollStatusSchema,
  markPayrollPaidSchema,
  queryPayrollRunsSchema,
  queryPayslipsSchema,
} from './payroll.schemas';
import { logger } from '../../utils/logger';
import { sendCreated, sendSuccess } from '../../utils/response';
import { resolveCurrentEmployeeProfile } from '../employees/employee-profile.service';

const canManageOrganizationPayroll = (req: Request) =>
  Boolean(
    req.user?.isSuperAdmin ||
    req.tenant?.permissions.includes('*') ||
    req.tenant?.permissions.includes('payroll:process')
  );

export class PayrollController {
  /**
   * Preview standard statutory Indian salary structure from Annual CTC
   */
  public static async previewSalaryBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ctc } = autoCalculateSalarySchema.parse(req.body);
      const breakdown = PayrollService.calculateStatutoryBreakdown(ctc);

      sendSuccess(res, 'Statutory salary breakdown calculated', breakdown);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign or update employee salary structure
   */
  public static async setSalaryStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const data = createSalaryStructureSchema.parse(req.body);

      const structure = await PayrollService.setSalaryStructure(organizationId, data);

      logger.audit('CREATE', {
        entity: 'SalaryStructure',
        id: structure.id,
        user: req.user!.userId,
        org: organizationId,
      });

      sendCreated(res, 'Salary structure configured successfully', structure);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get salary structure for employee
   */
  public static async getSalaryStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const employeeId = canManageOrganizationPayroll(req)
        ? req.params.employeeId
        : (await resolveCurrentEmployeeProfile(organizationId, req.user!.userId)).id;

      const structure = await PayrollService.getSalaryStructure(organizationId, employeeId);

      sendSuccess(res, 'Salary structure retrieved', structure);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger monthly payroll computation
   */
  public static async processPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const params = runPayrollSchema.parse(req.body);

      const payrollRun = await PayrollService.processPayrollRun(organizationId, params);

      logger.audit('CREATE', {
        entity: 'PayrollRun',
        id: payrollRun.id,
        user: req.user!.userId,
        org: organizationId,
      });

      sendSuccess(res, `Payroll run generated for ${params.month}/${params.year}`, payrollRun);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payroll run status (Approve / Reject)
   */
  public static async updatePayrollStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const { status, notes } = updatePayrollStatusSchema.parse(req.body);

      const updated = await PayrollService.updatePayrollStatus(
        organizationId,
        id,
        req.user!.userId,
        status as any,
        notes
      );

      logger.audit('UPDATE', {
        entity: 'PayrollRun',
        id,
        status,
        user: req.user!.userId,
        org: organizationId,
      });

      sendSuccess(res, `Payroll run status changed to ${status}`, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark payroll as PAID / Disbursed
   */
  public static async markPayrollPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const { paymentMode, paymentRef } = markPayrollPaidSchema.parse(req.body);

      const updated = await PayrollService.markPayrollPaid(organizationId, id, paymentMode, paymentRef);

      logger.audit('UPDATE', {
        entity: 'PayrollRun',
        id,
        action: 'DISBURSED',
        user: req.user!.userId,
        org: organizationId,
      });

      sendSuccess(res, 'Payroll run marked as paid and disbursed successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all payroll runs
   */
  public static async listPayrollRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const query = queryPayrollRunsSchema.parse(req.query);

      const result = await PayrollService.listPayrollRuns(organizationId, query);

      res.status(200).json({
        success: true,
        data: result.runs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific payroll run by ID
   */
  public static async getPayrollRunById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;

      const run = await PayrollService.getPayrollRunById(organizationId, id);

      sendSuccess(res, 'Payroll run details retrieved', run);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List payslips for employees or specific employee
   */
  public static async listPayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const query = queryPayslipsSchema.parse(req.query);
      if (!canManageOrganizationPayroll(req)) {
        query.employeeId = (await resolveCurrentEmployeeProfile(
          organizationId,
          req.user!.userId
        )).id;
      }

      const result = await PayrollService.listPayslips(organizationId, query);

      res.status(200).json({
        success: true,
        data: result.payslips,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific payslip details
   */
  public static async getPayslipById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const employeeId = canManageOrganizationPayroll(req)
        ? undefined
        : (await resolveCurrentEmployeeProfile(organizationId, req.user!.userId)).id;

      const payslip = await PayrollService.getPayslipById(organizationId, id, employeeId);

      sendSuccess(res, 'Payslip details retrieved', payslip);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Executive payroll dashboard summary
   */
  public static async getPayrollSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      if (!canManageOrganizationPayroll(req)) {
        res.status(403).json({ success: false, message: 'Access forbidden: Insufficient permissions' });
        return;
      }
      const summary = await PayrollService.getPayrollSummary(organizationId);

      sendSuccess(res, 'Payroll summary retrieved', summary);
    } catch (error) {
      next(error);
    }
  }
}
