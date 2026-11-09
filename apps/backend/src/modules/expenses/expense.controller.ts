import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from './expense.service';
import { sendCreated, sendSuccess } from '../../utils/response';

export class ExpenseController {
  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const summary = await ExpenseService.getSummary(organizationId);
      sendSuccess(res, 'Expense summary retrieved', summary);
    } catch (error) {
      next(error);
    }
  }

  public static async listClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { employeeId, status, category } = req.query;

      const claims = await ExpenseService.listClaims(organizationId, {
        employeeId: employeeId as string | undefined,
        status: status as string | undefined,
        category: category as string | undefined,
      });

      sendSuccess(res, 'Expense claims retrieved', claims);
    } catch (error) {
      next(error);
    }
  }

  public static async submitClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const userId = req.user!.userId;

      const claim = await ExpenseService.submitClaim(
        organizationId,
        userId,
        req.body,
        req.ip,
        req.headers['user-agent']
      );

      sendCreated(res, 'Expense claim submitted successfully', claim);
    } catch (error) {
      next(error);
    }
  }

  public static async reviewClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const userId = req.user!.userId;
      const { id } = req.params;

      const updated = await ExpenseService.reviewClaim(
        organizationId,
        id,
        userId,
        req.body,
        req.ip,
        req.headers['user-agent']
      );

      sendSuccess(res, 'Expense claim reviewed successfully', updated);
    } catch (error) {
      next(error);
    }
  }
}
