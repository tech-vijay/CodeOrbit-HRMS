import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';
import { sendCreated, sendSuccess } from '../../utils/response';

export class OrganizationController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await OrganizationService.getProfile(req.tenant!.organizationId);
      sendSuccess(res, 'Organization profile retrieved', org);
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const updated = await OrganizationService.updateProfile(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body,
        ip,
        userAgent
      );
      sendSuccess(res, 'Organization settings updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  public static async getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await OrganizationService.getRoles(req.tenant!.organizationId);
      sendSuccess(res, 'Organization roles retrieved', roles);
    } catch (error) {
      next(error);
    }
  }

  public static async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await OrganizationService.getDepartments(req.tenant!.organizationId);
      sendSuccess(res, 'Departments retrieved', departments);
    } catch (error) {
      next(error);
    }
  }

  public static async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const dept = await OrganizationService.createDepartment(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body,
        ip,
        userAgent
      );
      sendCreated(res, 'Department created successfully', dept);
    } catch (error) {
      next(error);
    }
  }

  public static async getDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const designations = await OrganizationService.getDesignations(req.tenant!.organizationId);
      sendSuccess(res, 'Designations retrieved', designations);
    } catch (error) {
      next(error);
    }
  }

  public static async createDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const desig = await OrganizationService.createDesignation(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body,
        ip,
        userAgent
      );
      sendCreated(res, 'Designation created successfully', desig);
    } catch (error) {
      next(error);
    }
  }

  public static async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await OrganizationService.getMembers(req.tenant!.organizationId);
      sendSuccess(res, 'Organization members retrieved', members);
    } catch (error) {
      next(error);
    }
  }

  public static async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const member = await OrganizationService.inviteMember(
        req.tenant!.organizationId,
        req.user!.userId,
        req.body,
        ip,
        userAgent
      );
      sendCreated(res, 'Member invited successfully', member);
    } catch (error) {
      next(error);
    }
  }

  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await OrganizationService.getAuditLogs(req.tenant!.organizationId);
      sendSuccess(res, 'Audit logs retrieved', logs);
    } catch (error) {
      next(error);
    }
  }
}
