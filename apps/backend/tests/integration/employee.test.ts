import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Phase 2 — Organization & Employee Management Integration Tests', () => {
  const ts = Date.now();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let deptAId: string;
  let desigAId: string;
  let employeeAId: string;
  let onboardingTaskId: string;

  beforeAll(async () => {
    // 1. Setup Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Apex Technologies ${ts}`,
        organizationSlug: `apex-tech-${ts}`,
        adminFirstName: 'Aditya',
        adminLastName: 'Kashyap',
        email: `aditya-${ts}@apex.com`,
        password: 'Password@123!',
      });

    tokenOrgA = resA.body.data.accessToken;
    orgAId = resA.body.data.organization.id;

    // 2. Setup Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Zenith Cloud ${ts}`,
        organizationSlug: `zenith-cloud-${ts}`,
        adminFirstName: 'Zoya',
        adminLastName: 'Akhtar',
        email: `zoya-${ts}@zenith.com`,
        password: 'Password@123!',
      });

    tokenOrgB = resB.body.data.accessToken;
    orgBId = resB.body.data.organization.id;

    // 3. Create Department & Designation in Tenant A
    const deptRes = await request(app)
      .post('/api/v1/organizations/departments')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId)
      .send({
        name: 'Product Engineering',
        code: 'PROD-ENG',
      });
    deptAId = deptRes.body.data.id;

    const desigRes = await request(app)
      .post('/api/v1/organizations/designations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId)
      .send({
        title: 'Senior Full-Stack Architect',
        code: 'SR-ARCH',
      });
    desigAId = desigRes.body.data.id;
  });

  afterAll(async () => {
    if (orgAId) await prisma.organization.delete({ where: { id: orgAId } }).catch(() => {});
    if (orgBId) await prisma.organization.delete({ where: { id: orgBId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('POST /api/v1/employees', () => {
    it('should successfully create an employee with auto-generated code and onboarding tasks', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          firstName: 'Karan',
          lastName: 'Singhania',
          workEmail: `karan-${ts}@apex.com`,
          personalEmail: 'karan.personal@gmail.com',
          phone: '+91 98765 11223',
          joiningDate: '2026-11-01',
          employmentType: 'FULL_TIME',
          status: 'PROBATION',
          departmentId: deptAId,
          designationId: desigAId,
          createAccount: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeCode).toBe('EMP-0001'); // Auto-generated sequential ID
      expect(res.body.data.workEmail).toBe(`karan-${ts}@apex.com`);
      expect(res.body.data.department.id).toBe(deptAId);

      employeeAId = res.body.data.id;

      // Verify associated User and Membership were provisioned
      const membership = await prisma.membership.findFirst({
        where: { organizationId: orgAId, userId: res.body.data.userId },
        include: { role: true },
      });
      expect(membership).toBeDefined();
      expect(membership?.role.slug).toBe('employee');

      // Verify Onboarding tasks were seeded
      const tasks = await prisma.onboardingTask.findMany({
        where: { employeeId: employeeAId, organizationId: orgAId },
      });
      expect(tasks.length).toBeGreaterThanOrEqual(4);
      onboardingTaskId = tasks[0].id;
    });

    it('should reject employee creation with duplicate work email in same organization', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          firstName: 'Duplicate',
          lastName: 'Employee',
          workEmail: `karan-${ts}@apex.com`, // Duplicate
          joiningDate: '2026-11-01',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should assign sequential employee code EMP-0002 to next employee', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          firstName: 'Pooja',
          lastName: 'Hegde',
          workEmail: `pooja-${ts}@apex.com`,
          joiningDate: '2026-11-01',
          employmentType: 'FULL_TIME',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeCode).toBe('EMP-0002');
    });
  });

  describe('GET /api/v1/employees and Filtering', () => {
    it('should list employees with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/employees?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.page).toBe(1);
    });

    it('should filter employees by search query', async () => {
      const res = await request(app)
        .get('/api/v1/employees?search=Singhania')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].firstName).toBe('Karan');
    });
  });

  describe('PATCH /api/v1/employees/:id and Lifecycle Tracking', () => {
    it('should update employee status to ACTIVE and record lifecycle transition', async () => {
      const res = await request(app)
        .patch(`/api/v1/employees/${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          status: 'ACTIVE',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');

      // Check lifecycle history was recorded
      const lifecycle = await prisma.lifecycleEvent.findMany({
        where: { employeeId: employeeAId, organizationId: orgAId },
      });
      const hasProbationCompleted = lifecycle.some(
        (e) => e.eventType === 'PROBATION_COMPLETED'
      );
      expect(hasProbationCompleted).toBe(true);
    });
  });

  describe('Document & Onboarding Workflows', () => {
    it('should attach a document to employee', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${employeeAId}/documents`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          title: 'Aadhaar Government Card',
          documentType: 'IDENTITY_PROOF',
          fileUrl: 'https://s3.amazonaws.com/codeorbit-secure/aadhaar.pdf',
          fileName: 'aadhaar.pdf',
          fileSize: 1048576,
          mimeType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Aadhaar Government Card');
    });

    it('should update onboarding task to COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/v1/employees/${employeeAId}/onboarding-tasks/${onboardingTaskId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          status: 'COMPLETED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).toBeDefined();
    });
  });

  describe('Strict Multi-Tenant Cross-Access Prevention', () => {
    it('Tenant B cannot access Tenant A employee details', async () => {
      // Tenant B tries to request Tenant A employee using Tenant B credentials
      const res = await request(app)
        .get(`/api/v1/employees/${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Tenant B cannot spoof Tenant A ID to modify employee', async () => {
      const res = await request(app)
        .patch(`/api/v1/employees/${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgAId) // Spoofing tenant A
        .send({ status: 'TERMINATED' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Tenant isolation policy violation');
    });
  });
});
