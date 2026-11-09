import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

export const DEFAULT_PERMISSIONS = [
  // Organization
  { code: 'org:read', name: 'View Organization Profile', module: 'ORGANIZATION' },
  { code: 'org:update', name: 'Update Organization Settings', module: 'ORGANIZATION' },
  { code: 'org:delete', name: 'Delete Organization', module: 'ORGANIZATION' },

  // Employees
  { code: 'employee:read', name: 'View Employee Records', module: 'EMPLOYEE' },
  { code: 'employee:create', name: 'Add New Employee', module: 'EMPLOYEE' },
  { code: 'employee:update', name: 'Update Employee Records', module: 'EMPLOYEE' },
  { code: 'employee:delete', name: 'Terminate/Remove Employee', module: 'EMPLOYEE' },
  { code: 'employee:export', name: 'Export Employee Data', module: 'EMPLOYEE' },
  { code: 'employee:document_manage', name: 'Manage Employee Documents', module: 'EMPLOYEE' },
  { code: 'employee:onboard', name: 'Manage Employee Onboarding', module: 'EMPLOYEE' },

  // Branches
  { code: 'branch:read', name: 'View Office Branches', module: 'ORGANIZATION' },
  { code: 'branch:manage', name: 'Manage Office Branches', module: 'ORGANIZATION' },

  // Attendance
  { code: 'attendance:read', name: 'View Attendance Records', module: 'ATTENDANCE' },
  { code: 'attendance:checkin', name: 'Perform Self Check-in/out', module: 'ATTENDANCE' },
  { code: 'attendance:update', name: 'Modify Attendance Records', module: 'ATTENDANCE' },
  { code: 'attendance:approve', name: 'Approve Attendance Corrections', module: 'ATTENDANCE' },

  // Leave
  { code: 'leave:read', name: 'View Leave Requests', module: 'LEAVE' },
  { code: 'leave:apply', name: 'Apply For Leave', module: 'LEAVE' },
  { code: 'leave:approve', name: 'Approve or Reject Leaves', module: 'LEAVE' },
  { code: 'leave:manage_balance', name: 'Manage Leave Allocations', module: 'LEAVE' },

  // Payroll
  { code: 'payroll:read', name: 'View Payroll & Payslips', module: 'PAYROLL' },
  { code: 'payroll:process', name: 'Process Monthly Payroll', module: 'PAYROLL' },
  { code: 'payroll:approve', name: 'Approve Payroll Disbursals', module: 'PAYROLL' },

  // Recruitment & ATS
  { code: 'recruitment:read', name: 'View Job Postings & ATS Pipeline', module: 'RECRUITMENT' },
  { code: 'recruitment:manage_jobs', name: 'Create & Manage Job Openings', module: 'RECRUITMENT' },
  { code: 'recruitment:review_candidates', name: 'Review, Interview & Hire Candidates', module: 'RECRUITMENT' },

  // Performance Management & OKRs
  { code: 'performance:read', name: 'View Goals & Performance Reviews', module: 'PERFORMANCE' },
  { code: 'performance:manage_cycles', name: 'Create & Manage Performance Cycles', module: 'PERFORMANCE' },
  { code: 'performance:manage_goals', name: 'Set & Track Goals and Key Results', module: 'PERFORMANCE' },
  { code: 'performance:review', name: 'Submit & Calibrate Performance Reviews', module: 'PERFORMANCE' },

  // Expense Claims & Reimbursements
  { code: 'expense:read', name: 'View Expense Claims', module: 'EXPENSE' },
  { code: 'expense:apply', name: 'Submit Expense Claim', module: 'EXPENSE' },
  { code: 'expense:approve', name: 'Approve or Reject Expense Claims', module: 'EXPENSE' },
  { code: 'expense:reimburse', name: 'Process Expense Reimbursements', module: 'EXPENSE' },

  // Audit
  { code: 'audit:read', name: 'View System Audit Logs', module: 'AUDIT' },
];

export async function seedPermissions() {
  console.log('Seeding default permissions...');
  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: {
        code: perm.code,
        name: perm.name,
        module: perm.module,
      },
    });
  }
}

async function ensureDemoEmployeeProfile(
  organizationId: string,
  user: { id: string; email: string; firstName: string; lastName: string; phone: string | null },
  joiningDate: Date
) {
  const linkedEmployee = await prisma.employee.findFirst({
    where: { organizationId, userId: user.id },
  });
  if (linkedEmployee) return linkedEmployee;

  const emailEmployee = await prisma.employee.findFirst({
    where: {
      organizationId,
      workEmail: { equals: user.email, mode: 'insensitive' },
    },
  });

  if (emailEmployee) {
    if (emailEmployee.userId && emailEmployee.userId !== user.id) {
      throw new Error(`Employee profile for ${user.email} is linked to a different user`);
    }
    return prisma.employee.update({
      where: { id: emailEmployee.id },
      data: { userId: user.id },
    });
  }

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.update({
      where: { id: organizationId },
      data: { employeeCodeCounter: { increment: 1 } },
      select: { employeeCodePrefix: true, employeeCodeCounter: true },
    });

    return tx.employee.create({
      data: {
        organizationId,
        userId: user.id,
        employeeCode: `${organization.employeeCodePrefix}-${String(organization.employeeCodeCounter - 1).padStart(4, '0')}`,
        firstName: user.firstName,
        lastName: user.lastName,
        workEmail: user.email,
        phone: user.phone,
        joiningDate,
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
      },
    });
  });
}

async function main() {
  console.log('Starting CodeOrbit HRMS database seed...');

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && process.env.ENABLE_DEMO_SEED !== 'true') {
    console.log('Production demo seeding is disabled.');
    return;
  }
  const seedPassword = isProduction
    ? process.env.DEMO_SEED_PASSWORD
    : 'CodeOrbit@2026!';
  if (!seedPassword) {
    throw new Error('DEMO_SEED_PASSWORD is required when production demo seeding is enabled');
  }
  if (isProduction) {
    const existingDemoOrganization = await prisma.organization.findUnique({
      where: { slug: 'codeorbit-demo' },
      select: { id: true },
    });
    if (!existingDemoOrganization) {
      const existingDemoUsers = await prisma.user.findMany({
        where: { email: { in: ['admin@codeorbit.demo', 'riya.patel@codeorbit.demo'] } },
        select: { email: true },
      });
      if (existingDemoUsers.length > 0) {
        throw new Error(
          'Demo seeding stopped because one or more demo email addresses already belong to an account'
        );
      }
    }
  }

  // 1. Seed global permissions
  await seedPermissions();

  const passwordHash = await argon2.hash(seedPassword, {
    type: argon2.argon2id,
  });

  // 2. Seed Super Admin
  if (!isProduction) {
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@codeorbit.io' },
      update: {},
      create: {
        email: 'superadmin@codeorbit.io',
        passwordHash,
        firstName: 'Platform',
        lastName: 'SuperAdmin',
        isSuperAdmin: true,
        isEmailVerified: true,
        status: 'ACTIVE',
      },
    });
    console.log('SuperAdmin user ready:', superAdmin.email);
  }

  // 3. Seed Demo Tenant Organization: CodeOrbit Demo
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'codeorbit-demo' },
    update: {},
    create: {
      name: 'CodeOrbit Technologies',
      slug: 'codeorbit-demo',
      legalName: 'CodeOrbit Technologies Pvt Ltd',
      email: 'contact@codeorbit.demo',
      phone: '+91 98765 43210',
      status: 'ACTIVE',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      city: 'Mohali',
      state: 'Punjab',
      country: 'India',
    },
  });
  console.log('Demo Organization ready:', demoOrg.name, `(${demoOrg.slug})`);

  // 4. Create Company Admin Role for Demo Org
  const adminRole = await prisma.role.upsert({
    where: {
      organizationId_slug: {
        organizationId: demoOrg.id,
        slug: 'company_admin',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      name: 'Company Administrator',
      slug: 'company_admin',
      description: 'Full administrative access over all organization modules',
      isSystemRole: true,
    },
  });

  // Assign all permissions to Company Admin
  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: p.id,
      },
    });
  }

  // 5. Create HR Manager Role
  const hrRole = await prisma.role.upsert({
    where: {
      organizationId_slug: {
        organizationId: demoOrg.id,
        slug: 'hr_manager',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      name: 'HR Manager',
      slug: 'hr_manager',
      description: 'Manages employee records, attendance, leaves and HR operations',
      isSystemRole: true,
    },
  });

  const hrPermCodes = [
    'employee:read',
    'employee:create',
    'employee:update',
    'employee:export',
    'attendance:read',
    'attendance:update',
    'attendance:approve',
    'leave:read',
    'leave:approve',
    'leave:manage_balance',
    'expense:read',
    'expense:approve',
    'expense:reimburse',
    'audit:read',
  ];
  for (const code of hrPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: hrRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: hrRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  // 6. Create Employee Self-Service Role
  const empRole = await prisma.role.upsert({
    where: {
      organizationId_slug: {
        organizationId: demoOrg.id,
        slug: 'employee',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      name: 'Employee',
      slug: 'employee',
      description: 'Self-service attendance check-in, leave application, and personal records',
      isSystemRole: true,
    },
  });

  const empPermCodes = [
    'attendance:checkin',
    'attendance:read',
    'leave:apply',
    'leave:read',
    'payroll:read',
    'expense:apply',
    'expense:read',
  ];
  for (const code of empPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: empRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: empRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  // 7. Seed Demo Organization Admin User
  const demoAdminUser = await prisma.user.upsert({
    where: { email: 'admin@codeorbit.demo' },
    update: isProduction
      ? { passwordHash, isEmailVerified: true, status: 'ACTIVE' }
      : {},
    create: {
      email: 'admin@codeorbit.demo',
      passwordHash,
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '+91 98111 22334',
      isSuperAdmin: false,
      isEmailVerified: true,
      status: 'ACTIVE',
    },
  });

  // Assign membership to Demo Org
  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: demoOrg.id,
        userId: demoAdminUser.id,
      },
    },
    update: { roleId: adminRole.id, status: 'ACTIVE' },
    create: {
      organizationId: demoOrg.id,
      userId: demoAdminUser.id,
      roleId: adminRole.id,
      status: 'ACTIVE',
    },
  });

  await ensureDemoEmployeeProfile(
    demoOrg.id,
    demoAdminUser,
    new Date('2025-01-01T00:00:00.000Z')
  );

  // 8. Seed Demo Employee User (Riya Patel)
  const demoEmpUser = await prisma.user.upsert({
    where: { email: 'riya.patel@codeorbit.demo' },
    update: isProduction
      ? { passwordHash, isEmailVerified: true, status: 'ACTIVE' }
      : {},
    create: {
      email: 'riya.patel@codeorbit.demo',
      passwordHash,
      firstName: 'Riya',
      lastName: 'Patel',
      phone: '+91 98222 33445',
      isSuperAdmin: false,
      isEmailVerified: true,
      status: 'ACTIVE',
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: demoOrg.id,
        userId: demoEmpUser.id,
      },
    },
    update: { roleId: empRole.id, status: 'ACTIVE' },
    create: {
      organizationId: demoOrg.id,
      userId: demoEmpUser.id,
      roleId: empRole.id,
      status: 'ACTIVE',
    },
  });

  await ensureDemoEmployeeProfile(
    demoOrg.id,
    demoEmpUser,
    new Date('2025-01-15T00:00:00.000Z')
  );

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error in database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
