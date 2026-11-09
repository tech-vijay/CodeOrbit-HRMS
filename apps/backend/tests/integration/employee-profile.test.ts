import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const app = createApp();

describe('Current employee profile resolution', () => {
  const timestamp = Date.now();
  const emailLinkedUserEmail = `profile-link-${timestamp}@example.com`;
  const autoCreateUserEmail = `profile-create-${timestamp}@example.com`;
  let emailLinkedToken: string;
  let emailLinkedOrganizationId: string;
  let emailLinkedUserId: string;
  let emailLinkedEmployeeId: string;
  let autoCreateToken: string;
  let autoCreateOrganizationId: string;
  let autoCreateUserId: string;

  beforeAll(async () => {
    const linkedUser = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Profile Link Org ${timestamp}`,
        organizationSlug: `profile-link-${timestamp}`,
        adminFirstName: 'Linked',
        adminLastName: 'User',
        email: emailLinkedUserEmail,
        password: 'Password@123!',
      });
    emailLinkedToken = linkedUser.body.data.accessToken;
    emailLinkedOrganizationId = linkedUser.body.data.organization.id;
    emailLinkedUserId = linkedUser.body.data.user.id;

    const profile = await prisma.employee.create({
      data: {
        organizationId: emailLinkedOrganizationId,
        employeeCode: `LINK-${timestamp}`,
        firstName: 'Linked',
        lastName: 'User',
        workEmail: emailLinkedUserEmail,
        joiningDate: new Date(),
      },
    });
    emailLinkedEmployeeId = profile.id;

    const autoCreateUser = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({
        organizationName: `Profile Create Org ${timestamp}`,
        organizationSlug: `profile-create-${timestamp}`,
        adminFirstName: 'Created',
        adminLastName: 'User',
        email: autoCreateUserEmail,
        password: 'Password@123!',
      });
    autoCreateToken = autoCreateUser.body.data.accessToken;
    autoCreateOrganizationId = autoCreateUser.body.data.organization.id;
    autoCreateUserId = autoCreateUser.body.data.user.id;
  });

  afterAll(async () => {
    if (emailLinkedOrganizationId) {
      await prisma.organization.delete({ where: { id: emailLinkedOrganizationId } }).catch(() => {});
    }
    if (autoCreateOrganizationId) {
      await prisma.organization.delete({ where: { id: autoCreateOrganizationId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('links an unassigned tenant employee profile by email', async () => {
    const response = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', `Bearer ${emailLinkedToken}`)
      .set('x-tenant-id', emailLinkedOrganizationId);

    expect(response.status).toBe(200);
    expect(response.body.data.employee.id).toBe(emailLinkedEmployeeId);

    const employee = await prisma.employee.findFirst({
      where: { organizationId: emailLinkedOrganizationId, userId: emailLinkedUserId },
    });
    expect(employee?.id).toBe(emailLinkedEmployeeId);
  });

  it('creates a tenant employee profile when self-service leave is requested', async () => {
    const response = await request(app)
      .get('/api/v1/leaves/balances')
      .set('Authorization', `Bearer ${autoCreateToken}`)
      .set('x-tenant-id', autoCreateOrganizationId);

    expect(response.status).toBe(200);

    const employee = await prisma.employee.findFirst({
      where: { organizationId: autoCreateOrganizationId, userId: autoCreateUserId },
    });
    expect(employee).toMatchObject({
      firstName: 'Created',
      lastName: 'User',
      workEmail: autoCreateUserEmail,
      status: 'ACTIVE',
    });
  });

  it('updates personal details and changes the authenticated user password', async () => {
    const profileResponse = await request(app)
      .patch('/api/v1/employees/me')
      .set('Authorization', `Bearer ${autoCreateToken}`)
      .set('x-tenant-id', autoCreateOrganizationId)
      .send({
        phone: '+1 555 0100',
        panNumber: 'ABCDE1234F',
        uan: '123456789012',
        bankAccountHolderName: 'Created User',
        bankAccountNumber: '1234567890',
        bankIfsc: 'ABCD0123456',
        emergencyContactName: 'Emergency Contact',
        emergencyContactRelationship: 'Sibling',
        emergencyContactPhone: '+1 555 0101',
      });

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data).toMatchObject({
      phone: '+1 555 0100',
      panNumber: 'ABCDE1234F',
      uan: '123456789012',
      bankAccountNumber: '1234567890',
    });

    const passwordResponse = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${autoCreateToken}`)
      .send({ currentPassword: 'Password@123!', newPassword: 'NewPassword@123!' });

    expect(passwordResponse.status).toBe(200);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: autoCreateUserEmail, password: 'NewPassword@123!' });

    expect(loginResponse.status).toBe(200);
  });
});
