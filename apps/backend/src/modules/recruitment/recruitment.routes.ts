import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { RecruitmentController } from './recruitment.controller';

export const recruitmentRouter = Router();

// Public Job Board endpoint (Unauthenticated - Prospective applicants)
recruitmentRouter.get('/public/careers/:slug', RecruitmentController.getPublicOpenings);
recruitmentRouter.post('/public/careers/:slug/apply', RecruitmentController.applyPublicCandidate);

// Protected routes (Tenant context & Authenticated user required)
recruitmentRouter.use(authenticate, resolveTenantContext);

// Executive Recruitment Summary
recruitmentRouter.get('/summary', requirePermission('recruitment:read'), RecruitmentController.getRecruitmentSummary);

// Job Postings management
recruitmentRouter.post('/jobs', requirePermission('recruitment:manage_jobs'), RecruitmentController.createJobPosting);
recruitmentRouter.patch('/jobs/:id', requirePermission('recruitment:manage_jobs'), RecruitmentController.updateJobPosting);
recruitmentRouter.get('/jobs', requirePermission('recruitment:read'), RecruitmentController.listJobPostings);
recruitmentRouter.get('/jobs/:id', requirePermission('recruitment:read'), RecruitmentController.getJobPostingById);

// Candidates & ATS Pipeline
recruitmentRouter.post('/candidates', requirePermission('recruitment:review_candidates'), RecruitmentController.createCandidate);
recruitmentRouter.patch('/candidates/:id/stage', requirePermission('recruitment:review_candidates'), RecruitmentController.updateCandidateStage);
recruitmentRouter.get('/candidates', requirePermission('recruitment:read'), RecruitmentController.listCandidates);
recruitmentRouter.get('/candidates/:id', requirePermission('recruitment:read'), RecruitmentController.getCandidateById);

// Interviews & Notes
recruitmentRouter.post('/candidates/:id/interviews', requirePermission('recruitment:review_candidates'), RecruitmentController.scheduleInterview);
recruitmentRouter.patch('/interviews/:interviewId/feedback', requirePermission('recruitment:review_candidates'), RecruitmentController.submitInterviewFeedback);
recruitmentRouter.post('/candidates/:id/notes', requirePermission('recruitment:review_candidates'), RecruitmentController.addCandidateNote);
