import { Request, Response, NextFunction } from 'express';
import { LeaveService } from './leave.service';
import { sendCreated, sendSuccess } from '../../utils/response';

const hasPermission = (req: Request, permission: string) =>
  Boolean(
    req.user?.isSuperAdmin ||
    req.tenant?.permissions.includes('*') ||
    req.tenant?.permissions.includes(permission)
  );

export class LeaveController {
  public static async getLeaveTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const types = await LeaveService.getLeaveTypes(req.tenant!.organizationId);
      sendSuccess(res, 'Leave types retrieved', types);
    } catch (error) {
      next(error);
    }
  }

  public static async createLeaveType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaveType = await LeaveService.createLeaveType(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body
      );
      sendCreated(res, 'Leave type created successfully', leaveType);
    } catch (error) {
      next(error);
    }
  }

  public static async getLeaveBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = hasPermission(req, 'leave:manage_balance')
        ? req.query.employeeId as string | undefined
        : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;

      const balances = await LeaveService.getLeaveBalances(
        req.tenant!.organizationId,
        req.user!.userId,
        employeeId,
        year
      );
      sendSuccess(res, 'Leave balances retrieved', balances);
    } catch (error) {
      next(error);
    }
  }

  public static async applyLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || (req.socket.remoteAddress as string);
      const userAgent = req.headers['user-agent'];

      const leaveRequest = await LeaveService.applyLeave(
        req.tenant!.organizationId,
        req.user!.userId,
        hasPermission(req, 'leave:manage_balance')
          ? req.body
          : { ...req.body, employeeId: undefined },
        clientIp,
        userAgent
      );
      sendCreated(res, 'Leave application submitted successfully', leaveRequest);
    } catch (error) {
      next(error);
    }
  }

  public static async getLeaveRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = hasPermission(req, 'leave:approve')
        ? req.query
        : {
            ...req.query,
            employeeId: (await LeaveService.resolveEmployee(
              req.tenant!.organizationId,
              req.user!.userId
            )).id,
          };
      const result = await LeaveService.getLeaveRequests(
        req.tenant!.organizationId,
        query as any
      );
      sendSuccess(res, 'Leave requests retrieved', result.items, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async reviewLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || (req.socket.remoteAddress as string);
      const userAgent = req.headers['user-agent'];

      const reviewed = await LeaveService.reviewLeaveRequest(
        req.tenant!.organizationId,
        req.params.id,
        req.user!.userId,
        req.body,
        clientIp,
        userAgent
      );
      sendSuccess(res, `Leave request ${req.body.status.toLowerCase()}`, reviewed);
    } catch (error) {
      next(error);
    }
  }

  public static async cancelLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || (req.socket.remoteAddress as string);
      const userAgent = req.headers['user-agent'];

      const cancelled = await LeaveService.cancelLeaveRequest(
        req.tenant!.organizationId,
        req.params.id,
        req.user!.userId,
        req.body?.cancellationReason,
        hasPermission(req, 'leave:manage_balance'),
        clientIp,
        userAgent
      );
      sendSuccess(res, 'Leave request cancelled successfully', cancelled);
    } catch (error) {
      next(error);
    }
  }

  public static async getHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const holidays = await LeaveService.getHolidays(req.tenant!.organizationId, year);
      sendSuccess(res, 'Company holidays retrieved', holidays);
    } catch (error) {
      next(error);
    }
  }

  public static async createHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const holiday = await LeaveService.createHoliday(req.tenant!.organizationId, req.body);
      sendCreated(res, 'Company holiday registered', holiday);
    } catch (error) {
      next(error);
    }
  }

  public static async getLeaveSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await LeaveService.getLeaveSummary(req.tenant!.organizationId);
      sendSuccess(res, 'Leave summary retrieved', summary);
    } catch (error) {
      next(error);
    }
  }
}
