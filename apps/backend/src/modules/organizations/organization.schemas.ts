import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  legalName: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  code: z
    .string()
    .min(2, 'Department code must be at least 2 characters')
    .max(10, 'Code cannot exceed 10 characters')
    .toUpperCase(),
  description: z.string().optional(),
});

export const createDesignationSchema = z.object({
  title: z.string().min(2, 'Designation title must be at least 2 characters'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code cannot exceed 10 characters')
    .toUpperCase(),
  description: z.string().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().uuid('Valid role ID is required'),
  phone: z.string().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
