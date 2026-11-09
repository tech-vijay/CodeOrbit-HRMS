import { z } from 'zod';

export const createCycleSchema = z.object({
  title: z.string().min(2, 'Cycle title must be at least 2 characters').max(100),
  description: z.string().optional(),
  reviewType: z.enum(['QUARTERLY', 'ANNUAL', 'MID_YEAR', 'PROBATION']).default('QUARTERLY'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
  selfReviewDeadline: z.string().optional(),
  managerReviewDeadline: z.string().optional(),
});

export const updateCycleStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'EVALUATION', 'CALIBRATION', 'COMPLETED', 'ARCHIVED']),
});

export const keyResultInputSchema = z.object({
  title: z.string().min(2, 'Key result title required'),
  targetValue: z.number().min(0).default(100),
  currentValue: z.number().min(0).default(0),
  unit: z.string().optional().default('%'),
  isCompleted: z.boolean().optional().default(false),
});

export const createGoalSchema = z.object({
  employeeId: z.string().uuid('Valid employee ID is required'),
  cycleId: z.string().uuid().optional(),
  title: z.string().min(2, 'Goal title must be at least 2 characters').max(150),
  description: z.string().optional(),
  category: z.enum(['INDIVIDUAL', 'DEPARTMENT', 'COMPANY', 'DEVELOPMENT']).default('INDIVIDUAL'),
  weightage: z.number().int().min(1).max(100).default(100),
  targetValue: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  unit: z.string().optional().default('%'),
  dueDate: z.string().optional(),
  keyResults: z.array(keyResultInputSchema).optional(),
});

export const updateGoalProgressSchema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  currentValue: z.number().min(0).optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED']).optional(),
  keyResults: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        title: z.string(),
        targetValue: z.number(),
        currentValue: z.number(),
        unit: z.string().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .optional(),
});

export const submitSelfReviewSchema = z.object({
  selfRating: z.number().min(1, 'Rating must be between 1 and 5').max(5),
  selfFeedback: z.string().min(5, 'Please provide self assessment feedback (min 5 characters)'),
});

export const submitManagerReviewSchema = z.object({
  managerRating: z.number().min(1, 'Rating must be between 1 and 5').max(5),
  managerFeedback: z.string().min(5, 'Please provide manager assessment feedback (min 5 characters)'),
  promotionRecommended: z.boolean().optional().default(false),
  salaryHikePercentage: z.number().min(0).max(100).optional(),
  pipRequired: z.boolean().optional().default(false),
  pipNotes: z.string().optional(),
});

export const calibrateReviewSchema = z.object({
  finalRating: z.number().min(1, 'Final rating must be between 1 and 5').max(5),
  promotionRecommended: z.boolean().optional(),
  salaryHikePercentage: z.number().min(0).max(100).optional(),
  pipRequired: z.boolean().optional(),
  pipNotes: z.string().optional(),
});

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalProgressInput = z.infer<typeof updateGoalProgressSchema>;
export type SubmitSelfReviewInput = z.infer<typeof submitSelfReviewSchema>;
export type SubmitManagerReviewInput = z.infer<typeof submitManagerReviewSchema>;
export type CalibrateReviewInput = z.infer<typeof calibrateReviewSchema>;
