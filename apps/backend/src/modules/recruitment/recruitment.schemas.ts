import { z } from 'zod';

export const createJobPostingSchema = z.object({
  title: z.string().min(2, 'Job title is required').max(100),
  departmentId: z.string().uuid().optional().nullable(),
  description: z.string().min(10, 'Job description must be at least 10 characters'),
  requirements: z.union([z.string(), z.array(z.string())]).optional().nullable().transform((val) => {
    if (Array.isArray(val)) return val.join('\n');
    return val;
  }),
  responsibilities: z.union([z.string(), z.array(z.string())]).optional().nullable().transform((val) => {
    if (Array.isArray(val)) return val.join('\n');
    return val;
  }),
  location: z.string().default('Bengaluru, India'),
  workplaceType: z.enum(['ON_SITE', 'HYBRID', 'REMOTE']).default('HYBRID'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  experienceYears: z.string().optional().default('2-5 years'),
  experienceLevel: z.string().optional(),
  currency: z.string().optional().default('INR'),
  minSalary: z.number().min(0).optional().nullable(),
  maxSalary: z.number().min(0).optional().nullable(),
  openings: z.number().int().min(1).default(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).default('PUBLISHED'),
});

export const updateJobPostingSchema = createJobPostingSchema.partial();

export const queryJobPostingsSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  departmentId: z.string().uuid().optional(),
  workplaceType: z.enum(['ON_SITE', 'HYBRID', 'REMOTE']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const createCandidateSchema = z
  .object({
    jobPostingId: z.string().uuid('Invalid Job Posting ID'),
    fullName: z.string().min(2).max(100).optional(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().nullable(),
    resumeUrl: z.string().optional().nullable(),
    portfolioUrl: z.string().optional().nullable(),
    linkedinUrl: z.string().optional().nullable(),
    currentCompany: z.string().optional().nullable(),
    currentCtc: z.number().min(0).optional().nullable(),
    expectedCtc: z.number().min(0).optional().nullable(),
    noticePeriodDays: z.number().int().min(0).default(30),
    stage: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER_EXTENDED', 'HIRED', 'REJECTED']).optional().default('APPLIED'),
    notes: z.string().optional().nullable(),
  })
  .transform((data) => {
    let computedName = data.fullName;
    if (!computedName && data.firstName) {
      computedName = data.lastName ? `${data.firstName} ${data.lastName}`.trim() : data.firstName.trim();
    }
    return {
      ...data,
      fullName: computedName || 'Anonymous Candidate',
    };
  });

export const updateCandidateStageSchema = z.object({
  stage: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER_EXTENDED', 'HIRED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional().nullable(),
  feedbackNote: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const scheduleInterviewSchema = z.object({
  roundName: z.string().min(2, 'Round name is required'),
  roundNumber: z.number().int().min(1).default(1),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().optional().nullable(),
  interviewers: z.array(z.string()).optional().nullable(),
  interviewerName: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
});

export const submitInterviewFeedbackSchema = z.object({
  feedback: z.string().min(3, 'Interview feedback is required'),
  rating: z.number().int().min(1).max(5),
  isCompleted: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const addCandidateNoteSchema = z.object({
  content: z.string().min(2, 'Note content is required'),
  authorName: z.string().optional().default('HR Recruiter'),
});

export const queryCandidatesSchema = z.object({
  jobPostingId: z.string().uuid().optional(),
  stage: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER_EXTENDED', 'HIRED', 'REJECTED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
