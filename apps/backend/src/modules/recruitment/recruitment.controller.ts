import { Request, Response, NextFunction } from 'express';
import { RecruitmentService } from './recruitment.service';
import {
  createJobPostingSchema,
  updateJobPostingSchema,
  queryJobPostingsSchema,
  createCandidateSchema,
  updateCandidateStageSchema,
  scheduleInterviewSchema,
  submitInterviewFeedbackSchema,
  addCandidateNoteSchema,
  queryCandidatesSchema,
} from './recruitment.schemas';
import { logger } from '../../utils/logger';
import { sendCreated, sendSuccess } from '../../utils/response';

export class RecruitmentController {
  // --------------------------------------------------------------------------
  // JOB POSTINGS
  // --------------------------------------------------------------------------

  public static async createJobPosting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const data = createJobPostingSchema.parse(req.body);

      const job = await RecruitmentService.createJobPosting(organizationId, data);

      logger.audit('CREATE', {
        entity: 'JobPosting',
        id: job.id,
        user: req.user!.userId,
        org: organizationId,
      });

      sendCreated(res, 'Job opening created successfully', job);
    } catch (error) {
      next(error);
    }
  }

  public static async updateJobPosting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const data = updateJobPostingSchema.parse(req.body);

      const updated = await RecruitmentService.updateJobPosting(organizationId, id, data);

      logger.audit('UPDATE', {
        entity: 'JobPosting',
        id,
        user: req.user!.userId,
        org: organizationId,
      });

      sendSuccess(res, 'Job opening updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  public static async listJobPostings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const query = queryJobPostingsSchema.parse(req.query);

      const result = await RecruitmentService.listJobPostings(organizationId, query);

      res.status(200).json({
        success: true,
        data: {
          jobs: result.jobs,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getJobPostingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;

      const job = await RecruitmentService.getJobPostingById(organizationId, id);

      sendSuccess(res, 'Job opening details retrieved', job);
    } catch (error) {
      next(error);
    }
  }

  public static async getPublicOpenings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const result = await RecruitmentService.getPublicOpenings(slug);

      sendSuccess(res, 'Careers openings retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  public static async applyPublicCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const data = createCandidateSchema.parse(req.body);
      const result = await RecruitmentService.applyPublicCandidate(slug, data);

      sendSuccess(res, 'Application submitted successfully', result, undefined, 201);
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // CANDIDATES
  // --------------------------------------------------------------------------

  public static async createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const data = createCandidateSchema.parse(req.body);

      const candidate = await RecruitmentService.createCandidate(organizationId, data);

      logger.audit('CREATE', {
        entity: 'Candidate',
        id: candidate.id,
        user: req.user?.userId || 'PUBLIC_CANDIDATE',
        org: organizationId,
      });

      sendCreated(res, 'Candidate application submitted successfully', candidate);
    } catch (error) {
      next(error);
    }
  }

  public static async updateCandidateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const data = updateCandidateStageSchema.parse(req.body);

      const updated = await RecruitmentService.updateCandidateStage(organizationId, id, data);

      logger.audit('UPDATE', {
        entity: 'Candidate',
        id,
        stage: data.stage,
        user: req.user!.userId,
        org: organizationId,
      });

      sendSuccess(res, `Candidate stage transitioned to ${data.stage}`, updated);
    } catch (error) {
      next(error);
    }
  }

  public static async listCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const query = queryCandidatesSchema.parse(req.query);

      const result = await RecruitmentService.listCandidates(organizationId, query);

      res.status(200).json({
        success: true,
        data: result.candidates,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getCandidateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;

      const candidate = await RecruitmentService.getCandidateById(organizationId, id);

      sendSuccess(res, 'Candidate dossier retrieved', candidate);
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // INTERVIEWS & NOTES
  // --------------------------------------------------------------------------

  public static async scheduleInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params; // candidateId
      const data = scheduleInterviewSchema.parse(req.body);

      const round = await RecruitmentService.scheduleInterview(organizationId, id, data);

      logger.audit('CREATE', {
        entity: 'InterviewRound',
        id: round.id,
        user: req.user!.userId,
        org: organizationId,
      });

      sendCreated(res, 'Interview round scheduled successfully', round);
    } catch (error) {
      next(error);
    }
  }

  public static async submitInterviewFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { interviewId } = req.params;
      const data = submitInterviewFeedbackSchema.parse(req.body);

      const updated = await RecruitmentService.submitInterviewFeedback(organizationId, interviewId, data);

      sendSuccess(res, 'Interview feedback recorded', updated);
    } catch (error) {
      next(error);
    }
  }

  public static async addCandidateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params; // candidateId
      const data = addCandidateNoteSchema.parse(req.body);

      const note = await RecruitmentService.addCandidateNote(organizationId, id, data);

      sendCreated(res, 'Internal candidate note added', note);
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY METRICS
  // --------------------------------------------------------------------------

  public static async getRecruitmentSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const summary = await RecruitmentService.getRecruitmentSummary(organizationId);

      sendSuccess(res, 'Recruitment summary metrics retrieved', summary);
    } catch (error) {
      next(error);
    }
  }
}
