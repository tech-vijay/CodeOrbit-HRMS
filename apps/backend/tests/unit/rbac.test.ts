import { hasFullTenantAccess } from '../../src/middlewares/rbac.middleware';

describe('tenant permission bypass', () => {
  it.each([
    ['company_admin', 'Member'],
    ['member', 'Company Administrator'],
    ['SUPER_ADMIN', 'Member'],
    ['member', 'Super Admin'],
    ['HR_MANAGER', 'Member'],
    ['member', 'HR Manager'],
  ])('grants full access to %s / %s role identifiers', (roleSlug, roleName) => {
    expect(
      hasFullTenantAccess({
        roleSlug,
        roleName,
        permissions: [],
      })
    ).toBe(true);
  });

  it.each(['*', 'all', ' ALL '])('grants full access for the %s wildcard', (wildcard) => {
    expect(
      hasFullTenantAccess({
        roleSlug: 'employee',
        roleName: 'Employee',
        permissions: [wildcard],
      })
    ).toBe(true);
  });

  it('does not grant full access to a standard employee', () => {
    expect(
      hasFullTenantAccess({
        roleSlug: 'employee',
        roleName: 'Employee',
        permissions: ['attendance:checkin'],
      })
    ).toBe(false);
  });
});
