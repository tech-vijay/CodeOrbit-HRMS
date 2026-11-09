import { prisma } from '../../config/prisma';
import { SubmitExpenseInput, ReviewExpenseInput } from './expense.schemas';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { AuditAction, ExpenseStatus, NotificationType } from '@prisma/client';

export class ExpenseService {
  /**
   * Executive Expense & Reimbursements KPI Summary
   */
  public static async getSummary(organizationId: string) {
    const claims = await prisma.expenseClaim.findMany({
      where: { organizationId },
      select: {
        amount: true,
        status: true,
        currency: true,
      },
    });

    let totalClaimed = 0;
    let pendingApprovalAmount = 0;
    let pendingApprovalCount = 0;
    let approvedForPayoutAmount = 0;
    let approvedForPayoutCount = 0;
    let reimbursedAmount = 0;
    let reimbursedCount = 0;

    for (const c of claims) {
      const val = Number(c.amount);
      totalClaimed += val;
      if (c.status === ExpenseStatus.PENDING || c.status === ExpenseStatus.APPROVED_BY_MANAGER) {
        pendingApprovalAmount += val;
        pendingApprovalCount++;
      } else if (c.status === ExpenseStatus.APPROVED_BY_FINANCE) {
        approvedForPayoutAmount += val;
        approvedForPayoutCount++;
      } else if (c.status === ExpenseStatus.REIMBURSED) {
        reimbursedAmount += val;
        reimbursedCount++;
      }
    }

    return {
      totalClaimed,
      pendingApprovalAmount,
      pendingApprovalCount,
      approvedForPayoutAmount,
      approvedForPayoutCount,
      reimbursedAmount,
      reimbursedCount,
      totalClaims: claims.length,
    };
  }

  /**
   * Submit new expense claim
   */
  public static async submitClaim(
    organizationId: string,
    userId: string,
    input: SubmitExpenseInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Resolve employee record
    let employeeId = input.employeeId;
    if (!employeeId) {
      const linkedEmp = await prisma.employee.findFirst({
        where: { userId, organizationId },
      });
      if (!linkedEmp) {
        throw new BadRequestError('No employee profile linked to current user');
      }
      employeeId = linkedEmp.id;
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { manager: true },
    });
    if (!employee) throw new NotFoundError('Employee not found');

    const claim = await prisma.expenseClaim.create({
      data: {
        organizationId,
        employeeId,
        title: input.title,
        description: input.description,
        category: input.category,
        amount: input.amount,
        currency: input.currency || 'INR',
        expenseDate: new Date(input.expenseDate),
        receiptUrl: input.receiptUrl,
        receiptName: input.receiptName,
        status: ExpenseStatus.PENDING,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });

    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'ExpenseClaim',
      entityId: claim.id,
      description: `Submitted expense claim '${claim.title}' for ${claim.currency} ${claim.amount}`,
      ipAddress,
      userAgent,
    });

    // Notify reporting manager if present
    if (employee.manager?.userId) {
      await NotificationService.notify({
        organizationId,
        userId: employee.manager.userId,
        title: 'New Expense Claim Submitted',
        message: `${employee.firstName} ${employee.lastName} submitted a claim of ${claim.currency} ${claim.amount} for '${claim.title}'.`,
        type: NotificationType.EXPENSE,
        link: '/dashboard/expenses',
      });
    }

    return claim;
  }

  /**
   * List claims with filtering
   */
  public static async listClaims(
    organizationId: string,
    filters: { employeeId?: string; status?: string; category?: string }
  ) {
    const where: any = { organizationId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;

    return prisma.expenseClaim.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            department: { select: { id: true, name: true } },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Manager / Finance Review of an Expense Claim
   */
  public static async reviewClaim(
    organizationId: string,
    claimId: string,
    reviewerUserId: string,
    input: ReviewExpenseInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const claim = await prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
      include: { employee: true },
    });
    if (!claim) throw new NotFoundError('Expense claim not found');

    const reviewerEmp = await prisma.employee.findFirst({
      where: { userId: reviewerUserId, organizationId },
    });

    let nextStatus: ExpenseStatus;
    if (input.action === 'APPROVE_MANAGER') {
      nextStatus = ExpenseStatus.APPROVED_BY_MANAGER;
    } else if (input.action === 'APPROVE_FINANCE') {
      nextStatus = ExpenseStatus.APPROVED_BY_FINANCE;
    } else {
      nextStatus = ExpenseStatus.REJECTED;
    }

    const updated = await prisma.expenseClaim.update({
      where: { id: claimId },
      data: {
        status: nextStatus,
        approverId: reviewerEmp?.id || claim.approverId,
        approvedAt: nextStatus !== ExpenseStatus.REJECTED ? new Date() : undefined,
        rejectionReason: nextStatus === ExpenseStatus.REJECTED ? input.rejectionReason : null,
      },
    });

    await AuditService.log({
      organizationId,
      userId: reviewerUserId,
      action: AuditAction.UPDATE,
      entityType: 'ExpenseClaim',
      entityId: claimId,
      description: `Expense claim '${claim.title}' transitioned to ${nextStatus}`,
      ipAddress,
      userAgent,
    });

    // Notify employee of review outcome
    if (claim.employee.userId) {
      const isApproved = nextStatus !== ExpenseStatus.REJECTED;
      await NotificationService.notify({
        organizationId,
        userId: claim.employee.userId,
        title: isApproved ? 'Expense Claim Approved' : 'Expense Claim Rejected',
        message: isApproved
          ? `Your claim '${claim.title}' (${claim.currency} ${claim.amount}) was approved (${nextStatus.replace(/_/g, ' ')}).`
          : `Your claim '${claim.title}' was rejected. Reason: ${input.rejectionReason || 'No reason provided.'}`,
        type: NotificationType.EXPENSE,
        link: '/dashboard/expenses',
      });
    }

    return updated;
  }
}
