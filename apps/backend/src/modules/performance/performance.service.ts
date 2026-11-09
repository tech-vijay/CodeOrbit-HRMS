import { prisma } from '../../config/prisma';
import {
  CreateCycleInput,
  CreateGoalInput,
  UpdateGoalProgressInput,
  SubmitSelfReviewInput,
  SubmitManagerReviewInput,
  CalibrateReviewInput,
} from './performance.schemas';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { AuditAction, PerformanceCycleStatus, ReviewStatus } from '@prisma/client';

export class PerformanceService {
  /**
   * Executive Performance & OKR Summary
   */
  public static async getSummary(organizationId: string) {
    const [activeCycle, totalGoals, completedGoals, reviews, employees] = await Promise.all([
      prisma.performanceCycle.findFirst({
        where: { organizationId, status: { in: ['ACTIVE', 'EVALUATION', 'CALIBRATION'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { reviews: true, goals: true } },
        },
      }),
      prisma.goal.count({ where: { organizationId } }),
      prisma.goal.count({ where: { organizationId, status: 'COMPLETED' } }),
      prisma.performanceReview.findMany({
        where: { organizationId },
        select: {
          status: true,
          selfRating: true,
          managerRating: true,
          finalRating: true,
          promotionRecommended: true,
          pipRequired: true,
        },
      }),
      prisma.employee.count({ where: { organizationId, status: 'ACTIVE' } }),
    ]);

    // Average goal completion
    const allGoals = await prisma.goal.findMany({
      where: { organizationId },
      select: { progress: true },
    });

    const avgGoalProgress = allGoals.length > 0
      ? Math.round(allGoals.reduce((sum, g) => sum + g.progress, 0) / allGoals.length)
      : 0;

    // Review status counts
    const reviewStats = {
      pendingSelf: reviews.filter((r) => r.status === ReviewStatus.PENDING_SELF).length,
      pendingManager: reviews.filter((r) => r.status === ReviewStatus.PENDING_MANAGER).length,
      pendingHr: reviews.filter((r) => r.status === ReviewStatus.PENDING_HR).length,
      completed: reviews.filter((r) => r.status === ReviewStatus.COMPLETED).length,
      promotions: reviews.filter((r) => r.promotionRecommended).length,
      pipRequired: reviews.filter((r) => r.pipRequired).length,
    };

    const completedWithRating = reviews.filter((r) => r.finalRating !== null);
    const avgRating = completedWithRating.length > 0
      ? Number(
          (
            completedWithRating.reduce((sum, r) => sum + (r.finalRating || 0), 0) /
            completedWithRating.length
          ).toFixed(1)
        )
      : 4.2;

    return {
      activeCycle,
      totalEmployees: employees,
      totalGoals,
      completedGoals,
      avgGoalProgress,
      avgRating,
      reviewStats,
    };
  }

  // -------------------------------------------------------------
  // PERFORMANCE CYCLES
  // -------------------------------------------------------------

  public static async listCycles(organizationId: string) {
    return prisma.performanceCycle.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { reviews: true, goals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async createCycle(
    organizationId: string,
    creatorId: string,
    input: CreateCycleInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const cycle = await prisma.performanceCycle.create({
      data: {
        organizationId,
        title: input.title,
        description: input.description,
        reviewType: input.reviewType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        selfReviewDeadline: input.selfReviewDeadline ? new Date(input.selfReviewDeadline) : null,
        managerReviewDeadline: input.managerReviewDeadline ? new Date(input.managerReviewDeadline) : null,
        status: PerformanceCycleStatus.ACTIVE,
      },
    });

    // Automatically enroll all active employees into the review cycle
    const activeEmployees = await prisma.employee.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { id: true, managerId: true },
    });

    if (activeEmployees.length > 0) {
      await prisma.performanceReview.createMany({
        data: activeEmployees.map((emp) => ({
          organizationId,
          cycleId: cycle.id,
          employeeId: emp.id,
          reviewerId: emp.managerId,
          status: ReviewStatus.PENDING_SELF,
        })),
        skipDuplicates: true,
      });
    }

    await AuditService.log({
      organizationId,
      userId: creatorId,
      action: AuditAction.CREATE,
      entityType: 'PerformanceCycle',
      entityId: cycle.id,
      description: `Launched performance appraisal cycle '${cycle.title}' with ${activeEmployees.length} employees`,
      ipAddress,
      userAgent,
    });

    return cycle;
  }

  public static async updateCycleStatus(
    organizationId: string,
    cycleId: string,
    status: PerformanceCycleStatus,
    userId: string
  ) {
    const cycle = await prisma.performanceCycle.findFirst({
      where: { id: cycleId, organizationId },
    });
    if (!cycle) throw new NotFoundError('Performance cycle not found');

    const updated = await prisma.performanceCycle.update({
      where: { id: cycleId },
      data: { status },
    });

    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'PerformanceCycle',
      entityId: cycleId,
      description: `Updated appraisal cycle status from ${cycle.status} to ${status}`,
    });

    return updated;
  }

  // -------------------------------------------------------------
  // GOALS & OKRS
  // -------------------------------------------------------------

  public static async listGoals(
    organizationId: string,
    filters: { employeeId?: string; cycleId?: string; status?: string }
  ) {
    const where: any = { organizationId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.cycleId) where.cycleId = filters.cycleId;
    if (filters.status) where.status = filters.status;

    return prisma.goal.findMany({
      where,
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        cycle: {
          select: { id: true, title: true },
        },
        keyResults: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async createGoal(
    organizationId: string,
    creatorId: string,
    input: CreateGoalInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, organizationId },
    });
    if (!employee) throw new NotFoundError('Employee not found in organization');

    const goal = await prisma.goal.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        cycleId: input.cycleId,
        title: input.title,
        description: input.description,
        category: input.category,
        weightage: input.weightage,
        targetValue: input.targetValue,
        currentValue: input.currentValue || 0,
        unit: input.unit || '%',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        keyResults: input.keyResults && input.keyResults.length > 0
          ? {
              create: input.keyResults.map((kr) => ({
                title: kr.title,
                targetValue: kr.targetValue ?? 100,
                currentValue: kr.currentValue ?? 0,
                unit: kr.unit || '%',
                isCompleted: kr.isCompleted ?? false,
              })),
            }
          : undefined,
      },
      include: {
        keyResults: true,
      },
    });

    await AuditService.log({
      organizationId,
      userId: creatorId,
      action: AuditAction.CREATE,
      entityType: 'Goal',
      entityId: goal.id,
      description: `Created goal '${goal.title}' for employee ${employee.firstName} ${employee.lastName}`,
      ipAddress,
      userAgent,
    });

    return goal;
  }

  public static async updateGoalProgress(
    organizationId: string,
    goalId: string,
    input: UpdateGoalProgressInput
  ) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, organizationId },
      include: { keyResults: true },
    });
    if (!goal) throw new NotFoundError('Goal not found');

    let calculatedProgress = input.progress ?? goal.progress;

    // Update key results if provided
    if (input.keyResults && input.keyResults.length > 0) {
      let completedCount = 0;
      for (const kr of input.keyResults) {
        if (kr.id) {
          const isDone = kr.currentValue >= kr.targetValue || Boolean(kr.isCompleted);
          if (isDone) completedCount++;
          await prisma.keyResult.update({
            where: { id: kr.id },
            data: {
              currentValue: kr.currentValue,
              targetValue: kr.targetValue,
              isCompleted: isDone,
            },
          });
        }
      }
      calculatedProgress = Math.round((completedCount / input.keyResults.length) * 100);
    }

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        progress: calculatedProgress,
        currentValue: input.currentValue ?? goal.currentValue,
        status:
          input.status ??
          (calculatedProgress >= 100
            ? 'COMPLETED'
            : calculatedProgress > 0
            ? 'IN_PROGRESS'
            : goal.status),
      },
      include: { keyResults: true },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // REVIEWS & APPRAISALS
  // -------------------------------------------------------------

  public static async listReviews(
    organizationId: string,
    filters: { cycleId?: string; status?: string; employeeId?: string; reviewerId?: string }
  ) {
    const where: any = { organizationId };
    if (filters.cycleId) where.cycleId = filters.cycleId;
    if (filters.status) where.status = filters.status;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.reviewerId) where.reviewerId = filters.reviewerId;

    return prisma.performanceReview.findMany({
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
            designation: { select: { id: true, title: true } },
          },
        },
        reviewer: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
        cycle: {
          select: { id: true, title: true, reviewType: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async getReviewById(organizationId: string, reviewId: string) {
    const review = await prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, title: true } },
          },
        },
        reviewer: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
        cycle: true,
      },
    });

    if (!review) throw new NotFoundError('Performance review not found');

    // Fetch goals for this employee in this cycle
    const goals = await prisma.goal.findMany({
      where: {
        organizationId,
        employeeId: review.employeeId,
        OR: [{ cycleId: review.cycleId }, { cycleId: null }],
      },
      include: { keyResults: true },
    });

    return { ...review, goals };
  }

  public static async submitSelfReview(
    organizationId: string,
    reviewId: string,
    input: SubmitSelfReviewInput
  ) {
    const review = await prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
    });
    if (!review) throw new NotFoundError('Performance review not found');

    const updated = await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        selfRating: input.selfRating,
        selfFeedback: input.selfFeedback,
        status: ReviewStatus.PENDING_MANAGER,
        submittedAt: new Date(),
      },
    });

    return updated;
  }

  public static async submitManagerReview(
    organizationId: string,
    reviewId: string,
    input: SubmitManagerReviewInput
  ) {
    const review = await prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
    });
    if (!review) throw new NotFoundError('Performance review not found');

    const updated = await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        managerRating: input.managerRating,
        managerFeedback: input.managerFeedback,
        promotionRecommended: input.promotionRecommended ?? false,
        salaryHikePercentage: input.salaryHikePercentage,
        pipRequired: input.pipRequired ?? false,
        pipNotes: input.pipNotes,
        status: ReviewStatus.PENDING_HR,
      },
    });

    return updated;
  }

  public static async calibrateReview(
    organizationId: string,
    reviewId: string,
    userId: string,
    input: CalibrateReviewInput
  ) {
    const review = await prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
    });
    if (!review) throw new NotFoundError('Performance review not found');

    const updated = await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        finalRating: input.finalRating,
        promotionRecommended: input.promotionRecommended ?? review.promotionRecommended,
        salaryHikePercentage: input.salaryHikePercentage ?? review.salaryHikePercentage,
        pipRequired: input.pipRequired ?? review.pipRequired,
        pipNotes: input.pipNotes ?? review.pipNotes,
        status: ReviewStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'PerformanceReview',
      entityId: reviewId,
      description: `Finalized appraisal rating (${input.finalRating}/5.0) for employee review ${reviewId}`,
    });

    return updated;
  }
}
