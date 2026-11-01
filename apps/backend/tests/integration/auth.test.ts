import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Auth & Multi-Tenancy Foundation Integration Tests', () => {
  const testTimestamp = Date.now();
  const testOrgSlug = `test-org-${testTimestamp}`;
  const testEmail = `admin-${testTimestamp}@orbitcorp.com`;
  let refreshTokenCookie: string;
  let accessToken: string;
  let organizationId: string;

  afterAll(async () => {
    // Clean up test data
    if (organizationId) {
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register-organization', () => {
    it('should successfully register a new organization with admin user and default roles', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-organization')
        .send({
          organizationName: 'OrbitCorp Global',
          organizationSlug: testOrgSlug,
          adminFirstName: 'Vikram',
          adminLastName: 'Malhotra',
          email: testEmail,
          password: 'Password@123!',
          phone: '+91 99999 88888',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.slug).toBe(testOrgSlug);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.activeRole.slug).toBe('company_admin');
      expect(res.body.data.accessToken).toBeDefined();

      organizationId = res.body.data.organization.id;
      accessToken = res.body.data.accessToken;

      // Ensure httpOnly refresh_token cookie was set
      const rawCookies = res.headers['set-cookie'];
      const cookieArr = Array.isArray(rawCookies) ? rawCookies : [String(rawCookies)];
      const hasRefreshCookie = cookieArr.some((c: string) => c.includes('refresh_token='));
      expect(hasRefreshCookie).toBe(true);
    });

    it('should reject registration if organization slug already exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-organization')
        .send({
          organizationName: 'Another Corp',
          organizationSlug: testOrgSlug, // duplicate
          adminFirstName: 'Rohan',
          adminLastName: 'Verma',
          email: `unique-${Date.now()}@test.com`,
          password: 'Password@123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should reject registration with invalid password strength', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-organization')
        .send({
          organizationName: 'Weak Pass Corp',
          organizationSlug: `weak-slug-${Date.now()}`,
          adminFirstName: 'Rohan',
          adminLastName: 'Verma',
          email: `weak-${Date.now()}@test.com`,
          password: 'weak', // fails Zod validation
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'Password@123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.activeOrganization).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies?.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      refreshTokenCookie = refreshCookie?.split(';')[0] || '';
    });

    it('should reject authentication with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword@123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return authenticated user profile with active tenant role and permissions', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.activeOrganization.slug).toBe(testOrgSlug);
      expect(res.body.data.activeOrganization.role.slug).toBe('company_admin');
      expect(res.body.data.activeOrganization.role.permissions.length).toBeGreaterThan(0);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
