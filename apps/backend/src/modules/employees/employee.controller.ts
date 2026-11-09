import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service';
import { sendCreated, sendSuccess } from '../../utils/response';

export class EmployeeController {
  public static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await EmployeeService.getMyProfile(
        req.tenant!.organizationId,
        req.user!.userId
      );
      sendSuccess(res, 'Personal profile retrieved', profile);
    } catch (error) {
      next(error);
    }
  }

  public static async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await EmployeeService.updateMyProfile(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, 'Personal profile updated', profile);
    } catch (error) {
      next(error);
    }
  }

  public static async createEmployee(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const employee = await EmployeeService.createEmployee(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body,
        ip,
        userAgent
      );

      sendCreated(res, 'Employee profile created successfully', employee);
    } catch (error) {
      next(error);
    }
  }

  public static async getEmployees(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await EmployeeService.getEmployees(
        req.tenant!.organizationId,
        req.query as any
      );
      sendSuccess(res, 'Employees retrieved successfully', result.items, result.meta);
    } catch (error) {
      next(error);
    }
  }

  public static async getEmployeeById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const employee = await EmployeeService.getEmployeeById(
        req.tenant!.organizationId,
        req.params.id
      );
      sendSuccess(res, 'Employee details retrieved', employee);
    } catch (error) {
      next(error);
    }
  }

  public static async updateEmployee(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await EmployeeService.updateEmployee(
        req.tenant!.organizationId,
        req.user!.userId,
        req.params.id,
        req.body,
        ip,
        userAgent
      );

      sendSuccess(res, 'Employee profile updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  public static async addDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const doc = await EmployeeService.addDocument(
        req.tenant!.organizationId,
        req.user!.userId,
        req.params.id,
        req.body,
        ip,
        userAgent
      );

      sendCreated(res, 'Document attached successfully', doc);
    } catch (error) {
      next(error);
    }
  }

  public static async updateOnboardingTask(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const task = await EmployeeService.updateOnboardingTask(
        req.tenant!.organizationId,
        req.user!.userId,
        req.params.taskId,
        req.body
      );

      sendSuccess(res, 'Onboarding task updated', task);
    } catch (error) {
      next(error);
    }
  }

  public static async addEmergencyContact(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const contact = await EmployeeService.addEmergencyContact(
        req.tenant!.organizationId,
        req.params.id,
        req.body
      );

      sendCreated(res, 'Emergency contact added', contact);
    } catch (error) {
      next(error);
    }
  }

  public static async exportEmployees(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await EmployeeService.exportEmployees(req.tenant!.organizationId);

      if (req.query.format === 'csv') {
        const headers = [
          'Employee Code',
          'Name',
          'Work Email',
          'Phone',
          'Department',
          'Designation',
          'Manager',
          'Employment Type',
          'Status',
          'Joining Date',
        ];
        const rows = data.map((e) => [
          `"${e.employeeCode}"`,
          `"${e.name.replace(/"/g, '""')}"`,
          `"${e.workEmail}"`,
          `"${e.phone}"`,
          `"${e.department.replace(/"/g, '""')}"`,
          `"${e.designation.replace(/"/g, '""')}"`,
          `"${e.manager.replace(/"/g, '""')}"`,
          `"${e.employmentType}"`,
          `"${e.status}"`,
          `"${e.joiningDate}"`,
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="employees_export.csv"');
        res.status(200).send(csvContent);
        return;
      }

      sendSuccess(res, 'Employee export dataset generated', data);
    } catch (error) {
      next(error);
    }
  }
}
