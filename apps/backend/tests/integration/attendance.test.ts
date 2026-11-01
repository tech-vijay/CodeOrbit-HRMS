import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Phase 3 — Attendance & Time Tracking Integration Tests', () => {
  const ts = Date.now();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let employeeAId: string;
  let employeeBId: string;
  let attendanceAId: string;
  let regularizationId: string;

  beforeAll(async () => {
    // 1. Setup Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Apex Attendance Corp ${ts}`,
        organizationSlug: `apex-att-${ts}`,
        adminFirstName: 'Aditya',
        adminLastName: 'Verma',
        email: `aditya-${ts}@apexatt.com`,
        password: 'Password@123!',
      });

    tokenOrgA = resA.body.data.accessToken;
    orgAId = resA.body.data.organization.id;

    // 2. Setup Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Zenith Time Labs ${ts}`,
        organizationSlug: `zenith-time-${ts}`,
        adminFirstName: 'Zoya',
        adminLastName: 'Khan',
        email: `zoya-${ts}@zenithtime.com`,
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
        firstName: 'Rahul',
        lastName: 'Sharma',
        workEmail: `rahul-${ts}@apexatt.com`,
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
        firstName: 'Farhan',
        lastName: 'Qureshi',
        workEmail: `farhan-${ts}@zenithtime.com`,
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

  describe('Clock-In & Attendance Initiation', () => {
    it('should successfully clock in an employee', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          checkIn: new Date().toISOString(),
          ipAddress: '192.168.1.100',
          location: 'Headquarters - Floor 3',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe(employeeAId);
      expect(res.body.data.checkIn).toBeDefined();
      expect(['PRESENT', 'LATE']).toContain(res.body.data.status);
      attendanceAId = res.body.data.id;
    });

    it('should reject second clock-in on the same day for the employee', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already marked attendance');
    });
  });

  describe('Break Tracking Workflow', () => {
    it('should successfully start a break', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          breakType: 'LUNCH',
          remarks: 'Lunch cafeteria',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.breakType).toBe('LUNCH');
      expect(res.body.data.endTime).toBeNull();
    });

    it('should reject starting another break while a break is active', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          breakType: 'TEA',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already on an active break');
    });

    it('should successfully end the active break', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/break/end')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          remarks: 'Back from lunch',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.endTime).toBeDefined();
      expect(typeof res.body.data.durationMinutes).toBe('number');
    });

    it('should reject ending a break when no break is currently active', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/break/end')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No active break found');
    });
  });

  describe('Clock-Out & Work Hours Computation', () => {
    it('should successfully clock out an employee and compute productive minutes', async () => {
      const checkOutTime = new Date();
      const res = await request(app)
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          checkOut: checkOutTime.toISOString(),
          remarks: 'Completed design reviews',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkOut).toBeDefined();
      expect(typeof res.body.data.productiveMinutes).toBe('number');
      expect(typeof res.body.data.overtimeMinutes).toBe('number');
    });

    it('should reject clock-out if already clocked out', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already clocked out');
    });
  });

  describe('Attendance Queries & Summary Insights', () => {
    it('should retrieve today status for employee including breaks', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/today?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(attendanceAId);
      expect(Array.isArray(res.body.data.breaks)).toBe(true);
      expect(res.body.data.breaks.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve organization attendance summary metrics', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/summary')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEmployees).toBeGreaterThanOrEqual(1);
      expect(res.body.data.present).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.data.attendanceRate).toBe('number');
    });

    it('should retrieve paginated attendance list with filters', async () => {
      const res = await request(app)
        .get('/api/v1/attendance?limit=10&page=1')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.attendances)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should export attendance records in CSV format', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/export')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Employee Code,Employee Name');
      expect(res.text).toContain('Check In,Check Out');
      expect(res.text).toContain('Rahul Sharma');
    });
  });

  describe('Regularization Request & Review Workflow', () => {
    it('should allow employee to submit an attendance regularization request', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/v1/attendance/regularize')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeAId,
          attendanceId: attendanceAId,
          date: todayStr,
          requestedCheckIn: '09:00:00',
          requestedCheckOut: '18:00:00',
          reason: 'Biometric fingerprint reader was offline at entry gate',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.reason).toContain('Biometric fingerprint reader');
      regularizationId = res.body.data.id;
    });

    it('should list pending regularization requests for manager/admin', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/regularize?status=PENDING')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((r: any) => r.id === regularizationId)).toBe(true);
    });

    it('should allow admin to approve regularization and update attendance record', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance/regularize/${regularizationId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          status: 'APPROVED',
          managerRemarks: 'Verified with security desk check-in register',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');

      // Verify attendance record was updated
      const updatedAtt = await prisma.attendance.findUnique({
        where: { id: attendanceAId },
      });
      expect(updatedAtt?.isRegularized).toBe(true);
      expect(updatedAtt?.productiveMinutes).toBe(540); // 9 hours = 540 min
    });
  });

  describe('Shift Policies', () => {
    it('should create and retrieve custom shift policy', async () => {
      const createRes = await request(app)
        .post('/api/v1/attendance/shifts')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          name: 'Morning General Shift',
          startTime: '09:00',
          endTime: '18:00',
          graceMinutes: 15,
          halfDayMinutes: 240,
          fullDayMinutes: 480,
          isDefault: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.name).toBe('Morning General Shift');

      const listRes = await request(app)
        .get('/api/v1/attendance/shifts')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multi-Tenant Isolation Strictness', () => {
    it('should prevent Tenant B from reading Tenant A attendance records', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance?employeeId=${employeeAId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(res.status).toBe(200);
      // Query scoped by orgBId must return 0 records for Tenant A's employee
      expect(res.body.data.attendances.length).toBe(0);
    });

    it('should prevent Tenant B from reviewing Tenant A regularization request', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance/regularize/${regularizationId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId)
        .send({
          status: 'APPROVED',
          managerRemarks: 'Attempt cross-tenant hijack',
        });

      expect(res.status).toBe(404);
    });

    it('should ensure Tenant B CSV export contains only Tenant B records', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/export')
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(res.status).toBe(200);
      expect(res.text).not.toContain('Rahul Sharma');
    });
  });
});
