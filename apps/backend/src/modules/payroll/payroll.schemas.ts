import { z } from 'zod';

export const createSalaryStructureSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  ctc: z.number().positive('Annual CTC must be greater than 0'),
  basicSalary: z.number().positive('Basic salary must be greater than 0'),
  hra: z.number().min(0).default(0),
  specialAllowance: z.number().min(0).default(0),
  conveyance: z.number().min(0).default(0),
  medicalAllowance: z.number().min(0).default(0),
  pfEmployer: z.number().min(0).default(0),
  pfEmployee: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(0),
  tds: z.number().min(0).default(0),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const autoCalculateSalarySchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  ctc: z.number().positive('Annual CTC must be greater than 0'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});

export const runPayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2050),
  notes: z.string().max(500).optional(),
});

export const updatePayrollStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PROCESSING', 'APPROVED', 'PAID', 'CANCELLED']),
  notes: z.string().max(500).optional(),
});

export const markPayrollPaidSchema = z.object({
  paymentMode: z.string().default('BANK_TRANSFER'),
  paymentRef: z.string().optional(),
});

export const queryPayrollRunsSchema = z.object({
  year: z.coerce.number().int().optional(),
  status: z.enum(['DRAFT', 'PROCESSING', 'APPROVED', 'PAID', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const queryPayslipsSchema = z.object({
  employeeId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
