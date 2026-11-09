import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { sendCreated, sendSuccess } from '../../utils/response';

const hasPermission = (req: Request, permission: string) =>
  Boolean(
    req.user?.isSuperAdmin ||
    req.tenant?.permissions.includes('*') ||
    req.tenant?.permissions.includes(permission)
  );

const selfAttendancePayload = (req: Request) =>
  hasPermission(req, 'attendance:update')
    ? req.body
    : { ...req.body, employeeId: undefined, attendanceId: undefined };

export class AttendanceController {
  public static async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || (req.socket.remoteAddress as string);
      const userAgent = req.headers['user-agent'];

      const record = await AttendanceService.clockIn(
        req.tenant!.organizationId,
        req.user!.userId,
        selfAttendancePayload(req),
        clientIp,
        userAgent
      );

      sendCreated(res, 'Punch in recorded successfully', record);
    } catch (error) {
      next(error);
    }
  }

  public static async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || (req.socket.remoteAddress as string);
      const userAgent = req.headers['user-agent'];

      const record = await AttendanceService.clockOut(
        req.tenant!.organizationId,
        req.user!.userId,
        selfAttendancePayload(req),
        clientIp,
        userAgent
      );

      sendSuccess(res, 'Punch out recorded successfully', record);
    } catch (error) {
      next(error);
    }
  }

  public static async startBreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await AttendanceService.startBreak(
        req.tenant!.organizationId,
        req.user!.userId,
        selfAttendancePayload(req)
      );
      sendSuccess(res, 'Break session started', record);
    } catch (error) {
      next(error);
    }
  }

  public static async endBreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await AttendanceService.endBreak(
        req.tenant!.organizationId,
        req.user!.userId,
        selfAttendancePayload(req)
      );
      sendSuccess(res, 'Break session concluded', record);
    } catch (error) {
      next(error);
    }
  }

  public static async getTodayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await AttendanceService.getTodayStatus(
        req.tenant!.organizationId,
        req.user!.userId,
        hasPermission(req, 'attendance:update') ? req.query.employeeId as string | undefined : undefined
      );
      sendSuccess(res, 'Today attendance status retrieved', status);
    } catch (error) {
      next(error);
    }
  }

  public static async getAttendanceRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = hasPermission(req, 'attendance:update')
        ? req.query
        : {
            ...req.query,
            employeeId: (await AttendanceService.resolveEmployee(
              req.tenant!.organizationId,
              req.user!.userId
            )).id,
          };
      const result = await AttendanceService.getAttendances(
        req.tenant!.organizationId,
        query as any
      );
      sendSuccess(res, 'Attendance records retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isOrganizationWide = hasPermission(req, 'attendance:update') || hasPermission(req, 'employee:read');
      const employeeId = isOrganizationWide
        ? undefined
        : (await AttendanceService.resolveEmployee(req.tenant!.organizationId, req.user!.userId)).id;
      const summary = await AttendanceService.getAttendanceSummary(
        req.tenant!.organizationId,
        req.query.date as string | undefined,
        employeeId
      );
      sendSuccess(res, 'Live attendance summary retrieved', summary);
    } catch (error) {
      next(error);
    }
  }

  public static async requestRegularization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AttendanceService.requestRegularization(
        req.tenant!.organizationId,
        req.user!.userId,
        selfAttendancePayload(req)
      );
      sendCreated(res, 'Attendance regularization submitted', result);
    } catch (error) {
      next(error);
    }
  }

  public static async getRegularizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = hasPermission(req, 'attendance:approve')
        ? req.query
        : {
            ...req.query,
            employeeId: (await AttendanceService.resolveEmployee(
              req.tenant!.organizationId,
              req.user!.userId
            )).id,
          };
      const result = await AttendanceService.getRegularizations(
        req.tenant!.organizationId,
        query as any
      );
      sendSuccess(res, 'Regularization requests retrieved', result.items, result.meta);
    } catch (error) {
      next(error);
    }
  }

  public static async reviewRegularization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = req.ip || (req.socket.remoteAddress as string);
      const userAgent = req.headers['user-agent'];

      const result = await AttendanceService.reviewRegularization(
        req.tenant!.organizationId,
        req.params.id,
        req.user!.userId,
        req.body,
        clientIp,
        userAgent
      );
      sendSuccess(res, `Regularization request ${req.body.status.toLowerCase()}`, result);
    } catch (error) {
      next(error);
    }
  }

  public static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csv = await AttendanceService.exportAttendanceCSV(
        req.tenant!.organizationId,
        req.query as any
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_${req.tenant!.organizationId}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  public static async getShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shifts = await AttendanceService.getShifts(req.tenant!.organizationId);
      sendSuccess(res, 'Configured shifts retrieved', shifts);
    } catch (error) {
      next(error);
    }
  }

  public static async createShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await AttendanceService.createShift(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body
      );
      sendCreated(res, 'Shift policy created', shift);
    } catch (error) {
      next(error);
    }
  }
}
