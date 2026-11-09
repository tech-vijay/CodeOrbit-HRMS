import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { submitExpenseSchema, reviewExpenseSchema } from './expense.schemas';
import { ExpenseController } from './expense.controller';

export const expenseRouter = Router();

// Enforce auth & tenant boundary across all expense routes
expenseRouter.use(authenticate, resolveTenantContext);

expenseRouter.get('/summary', requirePermission('expense:read'), ExpenseController.getSummary);
expenseRouter.get('/', requirePermission('expense:read'), ExpenseController.listClaims);
expenseRouter.post(
  '/',
  requirePermission('expense:apply'),
  validateRequest({ body: submitExpenseSchema }),
  ExpenseController.submitClaim
);
expenseRouter.patch(
  '/:id/review',
  requirePermission('expense:approve'),
  validateRequest({ body: reviewExpenseSchema }),
  ExpenseController.reviewClaim
);
