import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Phase 4 — Leave & Time-Off Management Integration Tests', () => {
  const ts = Date.now();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let employeeAId: string;
  let employeeBId: string;
  let clLeaveTypeId: string;
  let slLeaveTypeId: string;
  let leaveRequestId: string;

  beforeAll(async () => {
    // 1. Setup Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Apex Leave Corp ${ts}`,
        organizationSlug: `apex-leave-${ts}`,
        adminFirstName: 'Vikram',
        adminLastName: 'Mehra',
        email: `vikram-${ts}@apexleave.com`,
        password: 'Password@123!',
      });

    tokenOrgA = resA.body.data.accessToken;
    orgAId = resA.body.data.organization.id;

    // 2. Setup Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Zenith Leave Labs ${ts}`,
        organizationSlug: `zenith-leave-${ts}`,
        adminFirstName: 'Ananya',
        adminLastName: 'Roy',
        email: `ananya-${ts}@zenithleave.com`,
        password: 'Password@123!',
      });

    tokenOrgB = resB.body.data.accessToken;
    orgBId = resB.body.data.organization.id;

    // 3. Create Employee in Tenant A
    const empResA = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId)
      .send({
        firstName: 'Siddharth',
        lastName: 'Malhotra',
        workEmail: `siddharth-${ts}@apexleave.com`,
        joiningDate: '2026-11-01',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
      });
    employeeAId = empResA.body.data.id;

    // 4. Create Employee in Tenant B
    const empResB = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-tenant-id', orgBId)
      .send({
        firstName: 'Mira',
        lastName: 'Kapoor',
        workEmail: `mira-${ts}@zenithleave.com`,
        joiningDate: '2026-11-01',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
      });
    employeeBId = empResB.body.data.id;
  });

  afterAll(async () => {
    if (orgAId) await prisma.organization.delete({ where: { id: orgAId } }).catch(() => {});
    if (orgBId) await prisma.organization.delete({ where: { id: orgBId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Leave Types & Auto-Seeding', () => {
    it('should retrieve auto-seeded leave types for organization', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/types')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      const cl = res.body.data.find((t: any) => t.code === 'CL');
      const sl = res.body.data.find((t: any) => t.code === 'SL');
      expect(cl).toBeDefined();
      expect(sl).toBeDefined();
      clLeaveTypeId = cl.id;
      slLeaveTypeId = sl.id;
    });

    it('should create a custom leave type (e.g., Paternity / Maternity Leave)', async () => {
      const res = await request(app)
        .post('/api/v1/leaves/types')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          name: 'Parental Leave',
          code: 'PL',
          description: 'Special paid leave for new parents',
          daysAllowed: 30,
          isPaid: true,
          color: '#8B5CF6',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('PL');
      expect(res.body.data.daysAllowed).toBe(30);
    });
  });

  describe('Leave Balances & Allocation', () => {
    it('should retrieve employee leave balances with remaining days', async () => {
      const res = await request(app)
        .get(`/api/v1/leaves/balances?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const clBalance = res.body.data.find((b: any) => b.leaveType.code === 'CL');
      expect(clBalance).toBeDefined();
      expect(clBalance.allocatedDays).toBe(12);
      expect(clBalance.usedDays).toBe(0);
      expect(clBalance.pendingDays).toBe(0);
      expect(clBalance.availableDays).toBe(12);
    });
  });

  describe('Leave Application Workflow', () => {
    it('should successfully apply for a 2-day leave', async () => {
      // Pick upcoming business days
      const res = await request(app)
        .post('/api/v1/leaves/apply')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          leaveTypeId: clLeaveTypeId,
          startDate: '2026-11-10',
          endDate: '2026-11-11',
          reason: 'Attending family wedding ceremony',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.totalDays).toBe(2);
      leaveRequestId = res.body.data.id;

      // Verify pendingDays incremented in balance
      const balRes = await request(app)
        .get(`/api/v1/leaves/balances?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      const clBal = balRes.body.data.find((b: any) => b.leaveType.id === clLeaveTypeId);
      expect(clBal.pendingDays).toBe(2);
      expect(clBal.availableDays).toBe(10);
    });

    it('should reject overlapping leave request for same dates', async () => {
      const res = await request(app)
        .post('/api/v1/leaves/apply')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          leaveTypeId: slLeaveTypeId,
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          reason: 'Doctor appointment overlap',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('active or pending leave request covering these dates');
    });

    it('should reject leave request exceeding available balance', async () => {
      const res = await request(app)
        .post('/api/v1/leaves/apply')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          leaveTypeId: clLeaveTypeId,
          startDate: '2026-12-01',
          endDate: '2026-12-25', // ~19 business days, exceeds 10 remaining CL
          reason: 'Long extended vacation',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient leave balance');
    });
  });

  describe('Leave Review & Approval Workflow', () => {
    it('should list pending leave requests for manager/admin', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/requests?status=PENDING')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((r: any) => r.id === leaveRequestId)).toBe(true);
    });

    it('should approve leave request and update employee used balance', async () => {
      const res = await request(app)
        .patch(`/api/v1/leaves/requests/${leaveRequestId}/review`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          status: 'APPROVED',
          managerRemarks: 'Approved. Please ensure sprint tasks are delegated.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');

      // Verify balance transitioned from pending to used
      const balRes = await request(app)
        .get(`/api/v1/leaves/balances?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      const clBal = balRes.body.data.find((b: any) => b.leaveType.id === clLeaveTypeId);
      expect(clBal.pendingDays).toBe(0);
      expect(clBal.usedDays).toBe(2);
      expect(clBal.availableDays).toBe(10);
    });
  });

  describe('Leave Cancellation Workflow', () => {
    it('should allow employee to cancel a pending request and restore balance', async () => {
      // 1. Submit 1-day SL
      const appRes = await request(app)
        .post('/api/v1/leaves/apply')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          leaveTypeId: slLeaveTypeId,
          startDate: '2026-11-20',
          endDate: '2026-11-20',
          reason: 'Dental checkup',
        });
      const slReqId = appRes.body.data.id;

      // 2. Cancel it
      const cancelRes = await request(app)
        .patch(`/api/v1/leaves/requests/${slReqId}/cancel`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          cancellationReason: 'Dentist rescheduled to weekend',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe('CANCELLED');

      // Verify pendingDays restored to 0
      const balRes = await request(app)
        .get(`/api/v1/leaves/balances?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      const slBal = balRes.body.data.find((b: any) => b.leaveType.id === slLeaveTypeId);
      expect(slBal.pendingDays).toBe(0);
    });
  });

  describe('Company Holidays & Summary Metrics', () => {
    it('should register and retrieve company holidays', async () => {
      const holidayRes = await request(app)
        .post('/api/v1/leaves/holidays')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          name: 'Annual Founders Day',
          date: '2026-12-15',
          description: 'Official corporate holiday',
          isMandatory: true,
        });

      expect(holidayRes.status).toBe(201);
      expect(holidayRes.body.success).toBe(true);
      expect(holidayRes.body.data.name).toBe('Annual Founders Day');

      const listRes = await request(app)
        .get('/api/v1/leaves/holidays?year=2026')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve leave summary statistics', async () => {
      const res = await request(app)
        .get('/api/v1/leaves/summary')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.pendingCount).toBe('number');
      expect(typeof res.body.data.activeLeaveTypesCount).toBe('number');
    });
  });

  describe('Multi-Tenant Isolation Strictness', () => {
    it('should prevent Tenant B from viewing Tenant A leave requests', async () => {
      const res = await request(app)
        .get(`/api/v1/leaves/requests?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should prevent Tenant B from reviewing Tenant A leave request', async () => {
      const res = await request(app)
        .patch(`/api/v1/leaves/requests/${leaveRequestId}/review`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId)
        .send({
          status: 'APPROVED',
          managerRemarks: 'Cross-tenant breach attempt',
        });

      expect(res.status).toBe(404);
    });
  });
});
