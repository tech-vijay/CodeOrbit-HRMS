import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from './performance.service';
import {
  createCycleSchema,
  updateCycleStatusSchema,
  createGoalSchema,
  updateGoalProgressSchema,
  submitSelfReviewSchema,
  submitManagerReviewSchema,
  calibrateReviewSchema,
} from './performance.schemas';
import { sendSuccess, sendCreated } from '../../utils/response';

export class PerformanceController {
  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const summary = await PerformanceService.getSummary(organizationId);
      sendSuccess(res, 'Performance summary retrieved', summary);
    } catch (error) {
      next(error);
    }
  }

  // CYCLES
  public static async listCycles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const cycles = await PerformanceService.listCycles(organizationId);
      sendSuccess(res, 'Performance cycles retrieved', cycles);
    } catch (error) {
      next(error);
    }
  }

  public static async createCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const creatorId = req.user!.userId;
      const data = createCycleSchema.parse(req.body);
      const cycle = await PerformanceService.createCycle(
        organizationId,
        creatorId,
        data,
        req.ip,
        req.get('user-agent')
      );
      sendCreated(res, 'Performance cycle created successfully', cycle);
    } catch (error) {
      next(error);
    }
  }

  public static async updateCycleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const { status } = updateCycleStatusSchema.parse(req.body);
      const cycle = await PerformanceService.updateCycleStatus(organizationId, id, status, req.user!.userId);
      sendSuccess(res, 'Cycle status updated', cycle);
    } catch (error) {
      next(error);
    }
  }

  // GOALS & OKRS
  public static async listGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { employeeId, cycleId, status } = req.query;
      const goals = await PerformanceService.listGoals(organizationId, {
        employeeId: employeeId as string,
        cycleId: cycleId as string,
        status: status as string,
      });
      sendSuccess(res, 'Goals retrieved', goals);
    } catch (error) {
      next(error);
    }
  }

  public static async createGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const creatorId = req.user!.userId;
      const data = createGoalSchema.parse(req.body);
      const goal = await PerformanceService.createGoal(
        organizationId,
        creatorId,
        data,
        req.ip,
        req.get('user-agent')
      );
      sendCreated(res, 'Goal created successfully', goal);
    } catch (error) {
      next(error);
    }
  }

  public static async updateGoalProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const data = updateGoalProgressSchema.parse(req.body);
      const updated = await PerformanceService.updateGoalProgress(organizationId, id, data);
      sendSuccess(res, 'Goal progress updated', updated);
    } catch (error) {
      next(error);
    }
  }

  // REVIEWS & APPRAISALS
  public static async listReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { cycleId, status, employeeId, reviewerId } = req.query;
      const reviews = await PerformanceService.listReviews(organizationId, {
        cycleId: cycleId as string,
        status: status as string,
        employeeId: employeeId as string,
        reviewerId: reviewerId as string,
      });
      sendSuccess(res, 'Performance reviews retrieved', reviews);
    } catch (error) {
      next(error);
    }
  }

  public static async getReviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const review = await PerformanceService.getReviewById(organizationId, id);
      sendSuccess(res, 'Review dossier retrieved', review);
    } catch (error) {
      next(error);
    }
  }

  public static async submitSelfReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const data = submitSelfReviewSchema.parse(req.body);
      const review = await PerformanceService.submitSelfReview(organizationId, id, data);
      sendSuccess(res, 'Self review submitted', review);
    } catch (error) {
      next(error);
    }
  }

  public static async submitManagerReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const data = submitManagerReviewSchema.parse(req.body);
      const review = await PerformanceService.submitManagerReview(organizationId, id, data);
      sendSuccess(res, 'Manager review submitted', review);
    } catch (error) {
      next(error);
    }
  }

  public static async calibrateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const data = calibrateReviewSchema.parse(req.body);
      const review = await PerformanceService.calibrateReview(organizationId, id, req.user!.userId, data);
      sendSuccess(res, 'Review calibration finalized', review);
    } catch (error) {
      next(error);
    }
  }
}
