import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Multi-Tenant Isolation Integration Tests', () => {
  const ts = Date.now();
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let deptAId: string;

  beforeAll(async () => {
    // 1. Register Organization A
    const resA = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: 'Alpha Logistics',
        organizationSlug: `alpha-logistics-${ts}`,
        adminFirstName: 'Ananya',
        adminLastName: 'Roy',
        email: `ananya-${ts}@alpha.com`,
        password: 'Password@123!',
      });

    tokenOrgA = resA.body.data.accessToken;
    orgAId = resA.body.data.organization.id;

    // 2. Register Organization B
    const resB = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: 'Beta Biotech',
        organizationSlug: `beta-biotech-${ts}`,
        adminFirstName: 'Bharat',
        adminLastName: 'Mehta',
        email: `bharat-${ts}@beta.com`,
        password: 'Password@123!',
      });

    tokenOrgB = resB.body.data.accessToken;
    orgBId = resB.body.data.organization.id;

    // 3. Create a Department in Organization A
    const deptRes = await request(app)
      .post('/api/v1/organizations/departments')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId)
      .send({
        name: 'Alpha Engineering',
        code: 'AENG',
        description: 'Core Engineering Dept of Alpha',
      });

    deptAId = deptRes.body.data.id;
  });

  afterAll(async () => {
    if (orgAId) await prisma.organization.delete({ where: { id: orgAId } }).catch(() => {});
    if (orgBId) await prisma.organization.delete({ where: { id: orgBId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('Tenant A can query its own profile and departments', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/departments')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((d: any) => d.id === deptAId)).toBe(true);
  });

  it('Tenant B cannot see Tenant A departments (strict tenant isolation)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/departments')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-tenant-id', orgBId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should NOT contain Organization A's department!
    expect(res.body.data.some((d: any) => d.id === deptAId)).toBe(false);
  });

  it('Tenant B is forbidden from impersonating Tenant A via x-tenant-id spoofing', async () => {
    // Tenant B user submits request with token for B, but tries to access Tenant A by setting x-tenant-id to Org A's ID
    const res = await request(app)
      .get('/api/v1/organizations/profile')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-tenant-id', orgAId); // Spoofed organization ID

    // Must be blocked by tenant context middleware!
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Tenant isolation policy violation');
  });

  it('Tenant A cannot update Tenant B settings', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/profile')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .set('x-tenant-id', orgBId) // Attacking Organization B
      .send({
        name: 'Hacked Organization Name',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Tenant B cannot view Tenant A audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/audit-logs')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-tenant-id', orgAId);

    expect(res.status).toBe(403);
  });
});
