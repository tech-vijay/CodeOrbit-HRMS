import { z } from 'zod';

const fileData = z.string().min(1).max(14 * 1024 * 1024);
const fileName = z.string().min(1).max(255);

export const uploadFileSchema = z.object({
  fileData,
  fileName,
  folder: z.enum(['documents', 'resumes', 'avatars', 'general']),
});

export const publicResumeSchema = z.object({
  fileData: z.string().min(1).max(7 * 1024 * 1024),
  fileName: fileName.refine((name) => /\.pdf$/i.test(name), 'Public resumes must be PDF files'),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
