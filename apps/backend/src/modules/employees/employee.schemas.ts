import { z } from 'zod';

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  workEmail: z.string().email('Valid work email is required'),
  personalEmail: z.string().email('Valid personal email').optional().or(z.literal('')),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(), // YYYY-MM-DD
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']).optional(),
  joiningDate: z.string().min(1, 'Joining date is required'), // YYYY-MM-DD
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'REMOTE'])
    .default('FULL_TIME'),
  status: z
    .enum(['PROBATION', 'ACTIVE', 'INACTIVE', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED', 'ON_LEAVE'])
    .default('PROBATION'),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  createAccount: z.boolean().default(false),
  initialPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
}).superRefine((employee, context) => {
  if (employee.createAccount && !employee.initialPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['initialPassword'],
      message: 'An initial password is required when creating an account',
    });
  }
});

export const updateMyProfileSchema = z.object({
  phone: z.string().trim().max(30).nullable().optional(),
  panNumber: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Enter a valid PAN number').nullable().optional(),
  uan: z.string().trim().regex(/^[0-9]{12}$/, 'UAN must contain 12 digits').nullable().optional(),
  bankAccountHolderName: z.string().trim().max(120).nullable().optional(),
  bankAccountNumber: z.string().trim().min(4).max(34).nullable().optional(),
  bankIfsc: z.string().trim().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Enter a valid IFSC code').nullable().optional(),
  emergencyContactName: z.string().trim().min(2).max(120).nullable().optional(),
  emergencyContactRelationship: z.string().trim().min(2).max(80).nullable().optional(),
  emergencyContactPhone: z.string().trim().min(5).max(30).nullable().optional(),
}).superRefine((profile, context) => {
  const emergencyFields = [
    profile.emergencyContactName,
    profile.emergencyContactRelationship,
    profile.emergencyContactPhone,
  ];
  if (emergencyFields.some(Boolean) && emergencyFields.some((value) => !value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['emergencyContactName'],
      message: 'Provide the name, relationship, and phone for the emergency contact',
    });
  }
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  status: z
    .enum(['PROBATION', 'ACTIVE', 'INACTIVE', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED', 'ON_LEAVE'])
    .optional(),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'REMOTE'])
    .optional(),
  departmentId: z.string().uuid().nullable().optional(),
  designationId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

export const addDocumentSchema = z.object({
  title: z.string().min(2, 'Document title is required'),
  documentType: z.enum([
    'IDENTITY_PROOF',
    'EMPLOYMENT_CONTRACT',
    'OFFER_LETTER',
    'RESUME',
    'EDUCATIONAL_CERTIFICATE',
    'EXPERIENCE_LETTER',
    'PAYSLIP_PREVIOUS',
    'OTHER',
  ]),
  fileUrl: z.union([
    z.string().url('Valid file URL required'),
    z.string().regex(
      /^\/(?:api\/v1\/upload\/files|uploads)\/(?:documents|resumes)\/[0-9a-f-]{36}_[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/i,
      'Valid managed file URL required'
    ),
  ]),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  expiryDate: z.string().optional(), // YYYY-MM-DD
});

export const addEmergencyContactSchema = z.object({
  name: z.string().min(2, 'Contact name is required'),
  relationship: z.string().min(2, 'Relationship is required'),
  phone: z.string().min(5, 'Valid phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const updateOnboardingTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'WAIVED']),
});

export const queryEmployeesSchema = z.object({
  search: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
export type AddEmergencyContactInput = z.infer<typeof addEmergencyContactSchema>;
export type UpdateOnboardingTaskInput = z.infer<typeof updateOnboardingTaskSchema>;
export type QueryEmployeesInput = z.infer<typeof queryEmployeesSchema>;
