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

  describe('API route compatibility aliases', () => {
    it.each(['/auth/register-organization', '/api/auth/register-organization', '/api/v1/auth/register-organization'])(
      'routes POST %s to the registration handler',
      async (route) => {
        const res = await request(app).post(route).send({});
        expect(res.status).toBe(400);
        expect(res.body.message).not.toContain('not found');
      }
    );

    it.each(['/health', '/api/health', '/api/v1/health'])(
      'serves the health check at %s',
      async (route) => {
        const res = await request(app).get(route);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
      }
    );

    it.each(['/api/departments', '/departments', '/api/audit', '/audit'])(
      'protects the %s compatibility route with authentication',
      async (route) => {
        const res = await request(app).get(route);
        expect(res.status).toBe(401);
        expect(res.body.message).not.toContain('not found');
      }
    );

    it('allows the configured Render frontend origin with credentialed CORS', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://codeorbit-hrms-frontend.onrender.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(
        'https://codeorbit-hrms-frontend.onrender.com'
      );
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
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

  describe('organization invitations', () => {
    it('uses a one-time invitation token instead of a shared password', async () => {
      const employeeRole = await prisma.role.findFirst({
        where: { organizationId, slug: 'employee' },
      });
      expect(employeeRole).toBeDefined();

      const invitedEmail = `invite-${testTimestamp}@orbitcorp.com`;
      const invitationResponse = await request(app)
        .post('/api/v1/organizations/members/invite')
        .set('Authorization', 'Bearer ' + accessToken)
        .set('x-tenant-id', organizationId)
        .send({
          email: invitedEmail,
          firstName: 'Invited',
          lastName: 'Employee',
          roleId: employeeRole!.id,
        });

      expect(invitationResponse.status).toBe(201);
      expect(invitationResponse.body.data.membership.status).toBe('INVITED');
      expect(invitationResponse.body.data.membership.user.status).toBe('PENDING_VERIFICATION');
      expect(invitationResponse.body.data.membership.user.passwordHash).toBeUndefined();
      expect(invitationResponse.body.data.invitationUrl).toContain('/accept-invitation?token=');

      const expiredToken = new URL(invitationResponse.body.data.invitationUrl).searchParams.get('token');
      expect(expiredToken).toHaveLength(64);

      const membershipId = invitationResponse.body.data.membership.id;
      await prisma.memberInvitation.updateMany({
        where: { membershipId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const resendResponse = await request(app)
        .post('/api/v1/organizations/members/invite')
        .set('Authorization', 'Bearer ' + accessToken)
        .set('x-tenant-id', organizationId)
        .send({
          email: invitedEmail,
          firstName: 'Invited',
          lastName: 'Employee',
          roleId: employeeRole!.id,
        });
      expect(resendResponse.status).toBe(201);
      const invitationToken = new URL(resendResponse.body.data.invitationUrl).searchParams.get('token');
      expect(invitationToken).toHaveLength(64);
      expect(invitationToken).not.toBe(expiredToken);

      const expiredAcceptResponse = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send({ token: expiredToken, password: 'NewPassword@123!' });
      expect(expiredAcceptResponse.status).toBe(400);

      const acceptResponse = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send({ token: invitationToken, password: 'NewPassword@123!' });
      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body.success).toBe(true);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: invitedEmail, password: 'NewPassword@123!' });
      expect(loginResponse.status).toBe(200);

      const replayResponse = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send({ token: invitationToken, password: 'AnotherPassword@123!' });
      expect(replayResponse.status).toBe(400);
      expect(replayResponse.body.message).toContain('invalid or has expired');
    });
  });
});
