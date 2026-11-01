import { z } from 'zod';

export const clockInSchema = z.object({
  employeeId: z.string().uuid().optional(), // Admin can clock-in on behalf of employee, otherwise inferred from user
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  remarks: z.string().max(255).optional(),
});

export const clockOutSchema = z.object({
  employeeId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  remarks: z.string().max(255).optional(),
});

export const startBreakSchema = z.object({
  employeeId: z.string().uuid().optional(),
  breakType: z.enum(['LUNCH', 'TEA', 'PERSONAL', 'MEETING']).default('LUNCH'),
  remarks: z.string().max(255).optional(),
});

export const endBreakSchema = z.object({
  employeeId: z.string().uuid().optional(),
  breakId: z.string().uuid().optional(),
  remarks: z.string().max(255).optional(),
});

export const regularizationRequestSchema = z.object({
  employeeId: z.string().uuid().optional(),
  attendanceId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  requestedCheckIn: z.string().optional(),
  requestedCheckOut: z.string().optional(),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
});

export const reviewRegularizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  managerRemarks: z.string().max(500).optional(),
});

export const queryAttendanceSchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF']).optional(),
  departmentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(31),
});

export const createShiftSchema = z.object({
  name: z.string().min(2).max(100),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (24h)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (24h)'),
  graceMinutes: z.number().int().min(0).max(120).default(15),
  isDefault: z.boolean().default(false),
});
