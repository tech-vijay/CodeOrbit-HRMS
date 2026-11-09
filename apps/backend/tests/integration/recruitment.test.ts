import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Phase 6 — Recruitment, ATS & Job Board Engine Integration Tests', () => {
  const ts = Date.now();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let orgASlug: string;
  let jobAId: string;
  let candidateA1Id: string;
  let candidateA2Id: string;
  let interviewAId: string;

  beforeAll(async () => {
    orgASlug = `orbit-ats-${ts}`;
    // 1. Setup Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Orbit ATS Talent ${ts}`,
        organizationSlug: orgASlug,
        adminFirstName: 'Vikram',
        adminLastName: 'Sethi',
        email: `vikram-${ts}@orbitats.com`,
        password: 'Password@123!',
      });

    tokenOrgA = resA.body.data.accessToken;
    orgAId = resA.body.data.organization.id;

    // 2. Setup Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Nexus Talent Global ${ts}`,
        organizationSlug: `nexus-talent-${ts}`,
        adminFirstName: 'Ananya',
        adminLastName: 'Roy',
        email: `ananya-${ts}@nexustalent.com`,
        password: 'Password@123!',
      });

    tokenOrgB = resB.body.data.accessToken;
    orgBId = resB.body.data.organization.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Job Posting Lifecycle', () => {
    it('should create a new published job posting in Tenant A', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/jobs')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          title: 'Senior Full Stack Engineer',
          workplaceType: 'HYBRID',
          location: 'Bangalore, India',
          experienceLevel: 'Senior Level (5+ yrs)',
          minSalary: 2500000,
          maxSalary: 3500000,
          currency: 'INR',
          description: 'We are looking for an experienced TypeScript and React developer.',
          requirements: ['5+ years Node.js & TypeScript', 'React/Next.js proficiency', 'PostgreSQL & Prisma'],
          status: 'PUBLISHED',
        });

      console.log('CREATE JOB STATUS:', res.status, res.body);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Senior Full Stack Engineer');
      expect(res.body.data.organizationId).toBe(orgAId);
      expect(res.body.data.status).toBe('PUBLISHED');
      jobAId = res.body.data.id;
    });

    it('should update job posting status and details', async () => {
      const res = await request(app)
        .patch(`/api/v1/recruitment/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          location: 'Bangalore / Remote',
          maxSalary: 3800000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location).toBe('Bangalore / Remote');
      expect(Number(res.body.data.maxSalary)).toBe(3800000);
    });

    it('should list job postings for Tenant A with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/v1/recruitment/jobs?status=PUBLISHED')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.jobs[0].title).toBe('Senior Full Stack Engineer');
    });

    it('should fetch public careers board for Tenant A slug without authentication', async () => {
      const res = await request(app)
        .get(`/api/v1/recruitment/public/careers/${orgASlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.name).toContain('Orbit ATS Talent');
      expect(res.body.data.openings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.openings[0].id).toBe(jobAId);
    });
  });

  describe('2. Candidate Application & ATS Pipeline', () => {
    it('should add candidate A1 to job posting A in Tenant A', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/candidates')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          jobPostingId: jobAId,
          firstName: 'Rohan',
          lastName: 'Mehta',
          email: `rohan-${ts}@example.com`,
          phone: '+91 98765 43210',
          resumeUrl: 'https://storage.codeorbit.io/resumes/rohan_mehta.pdf',
          portfolioUrl: 'https://github.com/rohanmehta',
          currentCompany: 'TechSoft Inc',
          currentCtc: 2000000,
          expectedCtc: 2800000,
          noticePeriodDays: 30,
          notes: 'Strong backend experience in PostgreSQL and Redis.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Rohan');
      expect(res.body.data.stage).toBe('APPLIED');
      candidateA1Id = res.body.data.id;
    });

    it('should add candidate A2 in Tenant A', async () => {
      const res = await request(app)
        .post('/api/v1/recruitment/candidates')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          jobPostingId: jobAId,
          firstName: 'Pooja',
          lastName: 'Deshmukh',
          email: `pooja-${ts}@example.com`,
          phone: '+91 98765 12345',
          resumeUrl: 'https://storage.codeorbit.io/resumes/pooja_deshmukh.pdf',
          currentCompany: 'CloudScale Labs',
          expectedCtc: 3200000,
          stage: 'SCREENING',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('SCREENING');
      candidateA2Id = res.body.data.id;
    });

    it('should promote candidate A1 to SCREENING stage', async () => {
      const res = await request(app)
        .patch(`/api/v1/recruitment/candidates/${candidateA1Id}/stage`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          stage: 'SCREENING',
          feedbackNote: 'Passed initial screening call by recruiter.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('SCREENING');
    });

    it('should schedule an interview round for candidate A1 and auto-transition to INTERVIEW', async () => {
      const res = await request(app)
        .post(`/api/v1/recruitment/candidates/${candidateA1Id}/interviews`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          roundName: 'Technical Architecture & Live Coding',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 60,
          interviewers: ['Lead Architect', 'Engineering Manager'],
          meetingLink: 'https://meet.google.com/xyz-orb-ats',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roundName).toBe('Technical Architecture & Live Coding');
      expect(res.body.data.candidateId).toBe(candidateA1Id);
      interviewAId = res.body.data.id;

      // Verify Candidate A1 was auto-transitioned to INTERVIEW
      const candCheck = await request(app)
        .get(`/api/v1/recruitment/candidates/${candidateA1Id}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(candCheck.body.data.stage).toBe('INTERVIEW');
    });

    it('should submit interview feedback and rating', async () => {
      const res = await request(app)
        .patch(`/api/v1/recruitment/interviews/${interviewAId}/feedback`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          rating: 5,
          feedback: 'Exceptional system design capabilities. Clean, modular code and good communication.',
          completed: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.completed).toBe(true);
    });

    it('should add a recruiter / hiring manager note to candidate', async () => {
      const res = await request(app)
        .post(`/api/v1/recruitment/candidates/${candidateA1Id}/notes`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          content: 'Candidate has a competing offer from a fintech startup expiring this Friday.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('competing offer');
    });

    it('should promote candidate A1 to OFFER_EXTENDED and then HIRED', async () => {
      const resOffer = await request(app)
        .patch(`/api/v1/recruitment/candidates/${candidateA1Id}/stage`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          stage: 'OFFER_EXTENDED',
          feedbackNote: 'Offered 32 LPA with joining bonus.',
        });

      expect(resOffer.status).toBe(200);
      expect(resOffer.body.data.stage).toBe('OFFER_EXTENDED');

      const resHired = await request(app)
        .patch(`/api/v1/recruitment/candidates/${candidateA1Id}/stage`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          stage: 'HIRED',
          feedbackNote: 'Candidate signed offer letter. Expected joining next month.',
        });

      expect(resHired.status).toBe(200);
      expect(resHired.body.data.stage).toBe('HIRED');
    });

    it('should fetch candidate details including interview rounds and notes', async () => {
      const res = await request(app)
        .get(`/api/v1/recruitment/candidates/${candidateA1Id}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interviewRounds.length).toBe(1);
      expect(res.body.data.notes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.jobPosting.title).toBe('Senior Full Stack Engineer');
    });
  });

  describe('3. Executive Recruitment Summary', () => {
    it('should calculate recruitment pipeline KPIs accurately for Tenant A', async () => {
      const res = await request(app)
        .get('/api/v1/recruitment/summary')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeJobsCount).toBe(1);
      expect(res.body.data.totalCandidatesCount).toBe(2);
      expect(res.body.data.hiredCount).toBe(1);
      expect(res.body.data.byStage.HIRED).toBe(1);
      expect(res.body.data.byStage.SCREENING).toBe(1);
    });
  });

  describe('4. Strict Multi-Tenant Isolation', () => {
    it('should isolate Tenant B from seeing Tenant A jobs and candidates', async () => {
      // Tenant B tries to list jobs
      const jobsB = await request(app)
        .get('/api/v1/recruitment/jobs')
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(jobsB.status).toBe(200);
      expect(jobsB.body.data.jobs.length).toBe(0);

      // Tenant B tries to fetch Candidate A1 by ID
      const candB = await request(app)
        .get(`/api/v1/recruitment/candidates/${candidateA1Id}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(candB.status).toBe(404);

      // Tenant B tries to update Candidate A1 stage
      const updateB = await request(app)
        .patch(`/api/v1/recruitment/candidates/${candidateA1Id}/stage`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId)
        .send({ stage: 'REJECTED' });

      expect(updateB.status).toBe(404);
    });
  });
});
