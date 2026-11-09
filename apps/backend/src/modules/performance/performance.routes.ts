import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { PerformanceController } from './performance.controller';

export const performanceRouter = Router();

// Enforce authentication & tenant boundary on all performance routes
performanceRouter.use(authenticate, resolveTenantContext);

// 1. Executive Summary & KPIs
performanceRouter.get('/summary', requirePermission('performance:read'), PerformanceController.getSummary);

// 2. Performance Cycles
performanceRouter.get('/cycles', requirePermission('performance:read'), PerformanceController.listCycles);
performanceRouter.post('/cycles', requirePermission('performance:manage_cycles'), PerformanceController.createCycle);
performanceRouter.patch('/cycles/:id/status', requirePermission('performance:manage_cycles'), PerformanceController.updateCycleStatus);

// 3. Goals & OKRs
performanceRouter.get('/goals', requirePermission('performance:read'), PerformanceController.listGoals);
performanceRouter.post('/goals', requirePermission('performance:manage_goals'), PerformanceController.createGoal);
performanceRouter.patch('/goals/:id/progress', requirePermission('performance:manage_goals'), PerformanceController.updateGoalProgress);

// 4. Performance Reviews & Appraisals
performanceRouter.get('/reviews', requirePermission('performance:read'), PerformanceController.listReviews);
performanceRouter.get('/reviews/:id', requirePermission('performance:read'), PerformanceController.getReviewById);
performanceRouter.patch('/reviews/:id/self', requirePermission('performance:review'), PerformanceController.submitSelfReview);
performanceRouter.patch('/reviews/:id/manager', requirePermission('performance:review'), PerformanceController.submitManagerReview);
performanceRouter.patch('/reviews/:id/calibrate', requirePermission('performance:review'), PerformanceController.calibrateReview);
