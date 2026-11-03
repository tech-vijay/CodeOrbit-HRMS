import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Phase 5 — Payroll & Compensation Engine Integration Tests', () => {
  const ts = Date.now();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let employeeA1Id: string;
  let employeeA2Id: string;
  let employeeBId: string;
  let payrollRunId: string;
  let payslipId: string;

  beforeAll(async () => {
    // 1. Setup Tenant A
    const resA = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Apex Payroll Global ${ts}`,
        organizationSlug: `apex-payroll-${ts}`,
        adminFirstName: 'Aditya',
        adminLastName: 'Verma',
        email: `aditya-${ts}@apexpay.com`,
        password: 'Password@123!',
      });

    tokenOrgA = resA.body.data.accessToken;
    orgAId = resA.body.data.organization.id;

    // 2. Setup Tenant B
    const resB = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Zenith Payroll Systems ${ts}`,
        organizationSlug: `zenith-payroll-${ts}`,
        adminFirstName: 'Kavita',
        adminLastName: 'Iyer',
        email: `kavita-${ts}@zenithpay.com`,
        password: 'Password@123!',
      });

    tokenOrgB = resB.body.data.accessToken;
    orgBId = resB.body.data.organization.id;

    // 3. Create Employees in Tenant A
    const empA1 = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId)
      .send({
        firstName: 'Rahul',
        lastName: 'Sharma',
        workEmail: `rahul-${ts}@apexpay.com`,
        joiningDate: '2024-01-15',
        employmentType: 'FULL_TIME',
      });
    employeeA1Id = empA1.body.data.id;

    const empA2 = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId)
      .send({
        firstName: 'Sneha',
        lastName: 'Menon',
        workEmail: `sneha-${ts}@apexpay.com`,
        joiningDate: '2024-02-01',
        employmentType: 'FULL_TIME',
      });
    employeeA2Id = empA2.body.data.id;

    // 4. Create Employee in Tenant B
    const empB = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-tenant-id', orgBId)
      .send({
        firstName: 'Dev',
        lastName: 'Patel',
        workEmail: `dev-${ts}@zenithpay.com`,
        joiningDate: '2024-03-01',
        employmentType: 'FULL_TIME',
      });
    employeeBId = empB.body.data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Salary Structure & Statutory Preview', () => {
    it('should generate standard Indian statutory salary breakdown from Annual CTC', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/preview-structure')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeA1Id,
          ctc: 1200000, // 12 LPA
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ctc).toBe(1200000);
      expect(res.body.data.basicSalary).toBe(50000); // 50% of 100,000 monthly
      expect(res.body.data.hra).toBe(20000); // 40% of Basic
      expect(res.body.data.conveyance).toBe(1600);
      expect(res.body.data.medicalAllowance).toBe(1250);
      expect(res.body.data.pfEmployee).toBe(1800); // 12% of capped standard 15k
      expect(res.body.data.professionalTax).toBe(200);
    });

    it('should configure and assign salary structure to Employee 1', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/salary-structures')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeA1Id,
          ctc: 1200000,
          basicSalary: 50000,
          hra: 20000,
          specialAllowance: 25350,
          conveyance: 1600,
          medicalAllowance: 1250,
          pfEmployer: 1800,
          pfEmployee: 1800,
          professionalTax: 200,
          tds: 5000,
          effectiveFrom: '2026-01-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe(employeeA1Id);
      expect(Number(res.body.data.ctc)).toBe(1200000);
      expect(res.body.data.isActive).toBe(true);
    });

    it('should configure and assign salary structure to Employee 2', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/salary-structures')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          employeeId: employeeA2Id,
          ctc: 600000,
          basicSalary: 25000,
          hra: 10000,
          specialAllowance: 10350,
          conveyance: 1600,
          medicalAllowance: 1250,
          pfEmployer: 1800,
          pfEmployee: 1800,
          professionalTax: 200,
          tds: 0,
          effectiveFrom: '2026-01-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should retrieve active salary structure for employee', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/salary-structures/${employeeA1Id}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee.employeeCode).toBe('EMP-0001');
    });
  });

  describe('Monthly Payroll Execution & LOP Deduction', () => {
    it('should process monthly payroll run for all eligible employees in Tenant A', async () => {
      const res = await request(app)
        .post('/api/v1/payroll/runs')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          month: 11,
          year: 2026,
          notes: 'November 2026 Regular Salary Disbursal',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.month).toBe(11);
      expect(res.body.data.year).toBe(2026);
      expect(res.body.data.employeeCount).toBe(2);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.payrollItems.length).toBe(2);

      payrollRunId = res.body.data.id;
      payslipId = res.body.data.payrollItems[0].id;
    });

    it('should list payroll runs with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/runs')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should get payroll run details with itemized employee breakdowns', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/runs/${payrollRunId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(payrollRunId);
      expect(res.body.data.payrollItems.length).toBe(2);
    });
  });

  describe('Approval, Disbursement & Payslips Workflow', () => {
    it('should allow admin to approve payroll run', async () => {
      const res = await request(app)
        .patch(`/api/v1/payroll/runs/${payrollRunId}/status`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          status: 'APPROVED',
          notes: 'Approved by Finance Director',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedBy).toBeDefined();
    });

    it('should disburse and mark payroll as PAID', async () => {
      const res = await request(app)
        .post(`/api/v1/payroll/runs/${payrollRunId}/disburse`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId)
        .send({
          paymentMode: 'NEFT_BATCH',
          paymentRef: `BATCH-HDFC-${ts}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.disbursedAt).toBeDefined();
    });

    it('should list finalized payslips for employees', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/payslips')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].isPaid).toBe(true);
    });

    it('should retrieve single itemized payslip by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}`)
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(payslipId);
      expect(Number(res.body.data.netSalary)).toBeGreaterThan(0);
      expect(res.body.data.employee.employeeCode).toBeDefined();
    });

    it('should retrieve executive payroll summary metrics', async () => {
      const res = await request(app)
        .get('/api/v1/payroll/summary')
        .set('Authorization', `Bearer ${tokenOrgA}`)
        .set('x-tenant-id', orgAId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEmployeesWithSalary).toBe(2);
      expect(Number(res.body.data.ytdDisbursedNet)).toBeGreaterThan(0);
    });
  });

  describe('Multi-Tenant Isolation Strictness', () => {
    it('Tenant B cannot access Tenant A payroll runs', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/runs/${payrollRunId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(res.status).toBe(404);
    });

    it('Tenant B cannot access Tenant A payslip item', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId);

      expect(res.status).toBe(404);
    });

    it('Tenant B cannot disburse or modify Tenant A payroll run', async () => {
      const res = await request(app)
        .patch(`/api/v1/payroll/runs/${payrollRunId}/status`)
        .set('Authorization', `Bearer ${tokenOrgB}`)
        .set('x-tenant-id', orgBId)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(404);
    });
  });
});
