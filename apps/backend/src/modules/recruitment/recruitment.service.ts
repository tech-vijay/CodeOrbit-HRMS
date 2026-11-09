import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';

export class RecruitmentService {
  /**
   * Helper to generate unique URL slug for job postings
   */
  private static generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // --------------------------------------------------------------------------
  // JOB POSTINGS
  // --------------------------------------------------------------------------

  public static async createJobPosting(organizationId: string, data: any) {
    const slug = this.generateSlug(data.title);

    const job = await prisma.jobPosting.create({
      data: {
        organizationId,
        departmentId: data.departmentId || null,
        title: data.title,
        slug,
        description: data.description,
        requirements: data.requirements || null,
        responsibilities: data.responsibilities || null,
        location: data.location || 'Bengaluru, India',
        workplaceType: data.workplaceType || 'HYBRID',
        employmentType: data.employmentType || 'FULL_TIME',
        experienceYears: data.experienceYears || '2-5 years',
        minSalary: data.minSalary !== undefined && data.minSalary !== null ? new Decimal(data.minSalary) : null,
        maxSalary: data.maxSalary !== undefined && data.maxSalary !== null ? new Decimal(data.maxSalary) : null,
        openings: data.openings || 1,
        status: data.status || 'PUBLISHED',
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return job;
  }

  public static async updateJobPosting(organizationId: string, jobId: string, data: any) {
    const job = await prisma.jobPosting.findFirst({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      throw new AppError('Job posting not found', 404);
    }

    const updateData: any = { ...data };
    if (data.minSalary !== undefined) {
      updateData.minSalary = data.minSalary !== null ? new Decimal(data.minSalary) : null;
    }
    if (data.maxSalary !== undefined) {
      updateData.maxSalary = data.maxSalary !== null ? new Decimal(data.maxSalary) : null;
    }
    if (data.status === 'CLOSED' && job.status !== 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.jobPosting.update({
      where: { id: jobId },
      data: updateData,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { candidates: true } },
      },
    });

    return updated;
  }

  public static async getJobPostingById(organizationId: string, jobId: string) {
    const job = await prisma.jobPosting.findFirst({
      where: { id: jobId, organizationId },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { candidates: true } },
      },
    });

    if (!job) {
      throw new AppError('Job posting not found', 404);
    }

    return job;
  }

  public static async listJobPostings(organizationId: string, params: any) {
    const { status, departmentId, workplaceType, search, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (workplaceType) where.workplaceType = workplaceType;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { candidates: true } },
        },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public Job Board: returns published openings for public careers portal
   */
  public static async getPublicOpenings(orgSlug: string) {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, logoUrl: true, website: true, city: true, country: true },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const jobs = await prisma.jobPosting.findMany({
      where: {
        organizationId: org.id,
        status: 'PUBLISHED',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    return {
      organization: org,
      openings: jobs,
    };
  }

  /**
   * Public Applicant Submission: allows external candidates to apply to an opening
   */
  public static async applyPublicCandidate(orgSlug: string, data: any) {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    const job = await prisma.jobPosting.findFirst({
      where: {
        id: data.jobPostingId,
        organizationId: org.id,
        status: 'PUBLISHED',
      },
    });

    if (!job) {
      throw new AppError('The selected job position is not currently open for applications', 400);
    }

    return this.createCandidate(org.id, data);
  }

  // --------------------------------------------------------------------------
  // CANDIDATES & APPLICATION PIPELINE
  // --------------------------------------------------------------------------

  public static async createCandidate(organizationId: string, data: any) {
    const job = await prisma.jobPosting.findFirst({
      where: { id: data.jobPostingId, organizationId },
    });

    if (!job) {
      throw new AppError('Job posting not found in organization', 404);
    }

    if (job.status !== 'PUBLISHED') {
      throw new AppError('Cannot apply to an unlisted or closed position', 400);
    }

    // Check duplicate application
    const existing = await prisma.candidate.findUnique({
      where: {
        jobPostingId_email: {
          jobPostingId: data.jobPostingId,
          email: data.email.toLowerCase().trim(),
        },
      },
    });

    if (existing) {
      throw new AppError('Candidate with this email has already applied for this opening', 409);
    }

    const candidate = await prisma.candidate.create({
      data: {
        organizationId,
        jobPostingId: data.jobPostingId,
        fullName: data.fullName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone || null,
        resumeUrl: data.resumeUrl || null,
        portfolioUrl: data.portfolioUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        currentCompany: data.currentCompany || null,
        currentCtc: data.currentCtc !== undefined && data.currentCtc !== null ? new Decimal(data.currentCtc) : null,
        expectedCtc: data.expectedCtc !== undefined && data.expectedCtc !== null ? new Decimal(data.expectedCtc) : null,
        noticePeriodDays: data.noticePeriodDays || 30,
        stage: data.stage || 'APPLIED',
      },
      include: {
        jobPosting: { select: { id: true, title: true } },
      },
    });

    if (data.notes) {
      await prisma.candidateNote.create({
        data: {
          candidateId: candidate.id,
          authorName: 'Application Intake',
          content: data.notes,
        },
      });
    }

    const nameParts = candidate.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      ...candidate,
      firstName,
      lastName,
    };
  }

  public static async updateCandidateStage(organizationId: string, candidateId: string, data: any) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }

    const updateData: any = {
      stage: data.stage,
    };

    if (data.rejectionReason !== undefined) {
      updateData.rejectionReason = data.rejectionReason;
    }
    if (data.rating !== undefined) {
      updateData.rating = data.rating;
    }
    if (data.stage === 'HIRED' && candidate.stage !== 'HIRED') {
      updateData.hiredAt = new Date();
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
      include: {
        jobPosting: { select: { id: true, title: true } },
        interviews: true,
      },
    });

    if (data.feedbackNote) {
      await prisma.candidateNote.create({
        data: {
          candidateId,
          authorName: 'Hiring Committee',
          content: data.feedbackNote,
        },
      });
    }

    return updated;
  }

  public static async listCandidates(organizationId: string, params: any) {
    const { jobPostingId, stage, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (jobPostingId) where.jobPostingId = jobPostingId;
    if (stage) where.stage = stage;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { currentCompany: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appliedAt: 'desc' },
        include: {
          jobPosting: { select: { id: true, title: true } },
          interviews: {
            orderBy: { roundNumber: 'asc' },
          },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    return {
      candidates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getCandidateById(organizationId: string, candidateId: string) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
      include: {
        jobPosting: {
          select: {
            id: true,
            title: true,
            department: { select: { name: true } },
          },
        },
        interviews: {
          orderBy: { roundNumber: 'asc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }

    return {
      ...candidate,
      interviewRounds: candidate.interviews,
    };
  }

  // --------------------------------------------------------------------------
  // INTERVIEWS & EVALUATION NOTES
  // --------------------------------------------------------------------------

  public static async scheduleInterview(organizationId: string, candidateId: string, data: any) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new AppError('Candidate not found in organization', 404);
    }

    let interviewerName = data.interviewerName;
    if (!interviewerName && data.interviewers && Array.isArray(data.interviewers)) {
      interviewerName = data.interviewers.join(', ');
    }

    const round = await prisma.interviewRound.create({
      data: {
        candidateId,
        roundName: data.roundName,
        roundNumber: data.roundNumber || 1,
        scheduledAt: new Date(data.scheduledAt),
        interviewerName: interviewerName || null,
        meetingLink: data.meetingLink || null,
      },
    });

    // Auto move candidate stage to INTERVIEW if in screening/applied
    if (candidate.stage === 'APPLIED' || candidate.stage === 'SCREENING') {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: { stage: 'INTERVIEW' },
      });
    }

    return round;
  }

  public static async submitInterviewFeedback(organizationId: string, interviewId: string, data: any) {
    const round = await prisma.interviewRound.findFirst({
      where: {
        id: interviewId,
        candidate: { organizationId },
      },
      include: { candidate: true },
    });

    if (!round) {
      throw new AppError('Interview round not found', 404);
    }

    const isCompleted = data.completed ?? data.isCompleted ?? true;

    const updated = await prisma.interviewRound.update({
      where: { id: interviewId },
      data: {
        feedback: data.feedback,
        rating: data.rating,
        isCompleted,
      },
    });

    return {
      ...updated,
      completed: updated.isCompleted,
    };
  }

  public static async addCandidateNote(organizationId: string, candidateId: string, data: any) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });

    if (!candidate) {
      throw new AppError('Candidate not found in organization', 404);
    }

    const note = await prisma.candidateNote.create({
      data: {
        candidateId,
        authorName: data.authorName || 'HR Recruiter',
        content: data.content,
      },
    });

    return note;
  }

  // --------------------------------------------------------------------------
  // EXECUTIVE RECRUITMENT METRICS & PIPELINE SUMMARY
  // --------------------------------------------------------------------------

  public static async getRecruitmentSummary(organizationId: string) {
    const [
      activeJobsCount,
      totalCandidatesCount,
      candidatesByStage,
      recentCandidates,
      recentJobs,
    ] = await Promise.all([
      prisma.jobPosting.count({
        where: { organizationId, status: 'PUBLISHED' },
      }),
      prisma.candidate.count({
        where: { organizationId },
      }),
      prisma.candidate.groupBy({
        by: ['stage'],
        where: { organizationId },
        _count: { id: true },
      }),
      prisma.candidate.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { appliedAt: 'desc' },
        include: {
          jobPosting: { select: { title: true } },
        },
      }),
      prisma.jobPosting.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { candidates: true } },
        },
      }),
    ]);

    const stageMap: Record<string, number> = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER_EXTENDED: 0,
      HIRED: 0,
      REJECTED: 0,
    };

    for (const c of candidatesByStage) {
      stageMap[c.stage] = c._count.id;
    }

    return {
      activeJobsCount,
      totalCandidatesCount,
      hiredCount: stageMap.HIRED || 0,
      stageBreakdown: stageMap,
      byStage: stageMap,
      recentCandidates,
      recentJobs,
    };
  }
}
