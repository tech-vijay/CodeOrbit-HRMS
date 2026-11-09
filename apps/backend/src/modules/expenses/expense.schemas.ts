import { z } from 'zod';

export const submitExpenseSchema = z.object({
  employeeId: z.string().uuid().optional(),
  title: z.string().min(2, 'Expense title must be at least 2 characters').max(100),
  description: z.string().optional(),
  category: z.enum([
    'TRAVEL',
    'MEALS',
    'EQUIPMENT',
    'INTERNET',
    'TRAINING',
    'CLIENT_ENTERTAINMENT',
    'OTHER',
  ]),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().optional().default('INR'),
  expenseDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid expense date' }),
  receiptUrl: z.string().optional().nullable(),
  receiptName: z.string().optional().nullable(),
});

export const reviewExpenseSchema = z.object({
  action: z.enum(['APPROVE_MANAGER', 'APPROVE_FINANCE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export type SubmitExpenseInput = z.infer<typeof submitExpenseSchema>;
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;
