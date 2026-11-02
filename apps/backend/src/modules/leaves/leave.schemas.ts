import { z } from 'zod';

export const createLeaveTypeSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  description: z.string().max(255).optional(),
  daysAllowed: z.number().min(0).max(365).default(12),
  isPaid: z.boolean().default(true),
  requiresAttachment: z.boolean().default(false),
  carryForwardMaxDays: z.number().min(0).max(30).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E52328'),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const applyLeaveSchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  isHalfDay: z.boolean().default(false),
  halfDaySession: z.enum(['FIRST_HALF', 'SECOND_HALF']).optional(),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
  attachmentUrl: z.string().url().optional(),
});

export const reviewLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  managerRemarks: z.string().max(500).optional(),
});

export const cancelLeaveSchema = z.object({
  cancellationReason: z.string().max(255).optional(),
});

export const queryLeaveRequestsSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createHolidaySchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(255).optional(),
  isMandatory: z.boolean().default(true),
});

export const adjustBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  allocatedDays: z.number().min(0).max(365),
  carryForwardDays: z.number().min(0).max(50).default(0),
});
