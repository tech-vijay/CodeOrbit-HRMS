import { prisma } from '../../config/prisma';
import {
  RegisterOrganizationInput,
  LoginInput,
  SwitchOrganizationInput,
} from './auth.schemas';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
} from '../../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

export class AuthService {
  /**
   * Register a new company/organization and provision administrator user
   */
  public static async registerOrganization(
    input: RegisterOrganizationInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug },
    });
    if (existingOrg) {
      throw new ConflictError(`Organization slug '${input.organizationSlug}' is already registered`);
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictError(`A user account with email '${input.email}' already exists`);
    }

    const passwordHash = await hashPassword(input.password);
    const tokenFamily = generateRandomToken(16);

    // 3. Transaction: Create Org, Roles, User, Membership, Session & Audit Log
    const result = await prisma.$transaction(async (tx) => {
      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug,
          email: input.email.toLowerCase(),
          phone: input.phone,
          country: input.country,
          currency: input.currency,
          timezone: input.timezone,
          status: 'ACTIVE',
        },
      });

      // Create Admin User
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          phone: input.phone,
          isSuperAdmin: false,
          isEmailVerified: true,
          status: 'ACTIVE',
        },
      });

      // Provision Organization Roles
      const adminRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: 'Company Administrator',
          slug: 'company_admin',
          description: 'Full administrative control of the organization',
          isSystemRole: true,
        },
      });

      const hrRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: 'HR Manager',
          slug: 'hr_manager',
          description: 'Manages employees, attendance, and leave workflows',
          isSystemRole: true,
        },
      });

      const empRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: 'Employee',
          slug: 'employee',
          description: 'Self-service attendance check-in and leave management',
          isSystemRole: true,
        },
      });

      // Assign all system permissions to Company Administrator
      const allPermissions = await tx.permission.findMany();
      if (allPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allPermissions.map((p) => ({
            roleId: adminRole.id,
            permissionId: p.id,
          })),
        });

        // Assign standard HR permissions to HR Manager
        const hrPerms = allPermissions.filter((p) =>
          ['employee:read', 'employee:create', 'employee:update', 'attendance:read', 'leave:read', 'leave:approve'].includes(p.code)
        );
        if (hrPerms.length > 0) {
          await tx.rolePermission.createMany({
            data: hrPerms.map((p) => ({
              roleId: hrRole.id,
              permissionId: p.id,
            })),
          });
        }

        // Assign self-service permissions to Employee role
        const empPerms = allPermissions.filter((p) =>
          ['attendance:checkin', 'attendance:read', 'leave:apply', 'leave:read'].includes(p.code)
        );
        if (empPerms.length > 0) {
          await tx.rolePermission.createMany({
            data: empPerms.map((p) => ({
              roleId: empRole.id,
              permissionId: p.id,
            })),
          });
        }
      }

      // Create Membership linking User + Organization + Admin Role
      const membership = await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          roleId: adminRole.id,
          status: 'ACTIVE',
        },
      });

      // Issue tokens
      const rawRefreshToken = generateRandomToken(40);
      const hashedRefreshToken = hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await tx.refreshSession.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          tokenFamily,
          hashedRefreshToken,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        isSuperAdmin: false,
        activeOrganizationId: org.id,
        activeRole: adminRole.slug,
      });

      const refreshTokenJwt = signRefreshToken({
        userId: user.id,
        tokenFamily,
      });

      return {
        org,
        user,
        adminRole,
        membership,
        accessToken,
        refreshToken: `${rawRefreshToken}.${refreshTokenJwt}`,
      };
    });

    // Record Audit Log
    await AuditService.log({
      organizationId: result.org.id,
      userId: result.user.id,
      action: AuditAction.CREATE,
      entityType: 'Organization',
      entityId: result.org.id,
      description: `New organization '${result.org.name}' registered with admin '${result.user.email}'`,
      ipAddress,
      userAgent,
    });

    return {
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        email: result.org.email,
        status: result.org.status,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isSuperAdmin: false,
      },
      activeRole: {
        id: result.adminRole.id,
        name: result.adminRole.name,
        slug: result.adminRole.slug,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * User authentication with multi-tenant organization context resolution
   */
  public static async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            organization: true,
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenError(`Account temporarily locked. Please retry in ${waitMinutes} minute(s).`);
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError(`Account is ${user.status.toLowerCase()}. Please contact your organization administrator.`);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(user.passwordHash, input.password);
    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const willLock = attempts >= 5;
      const lockedUntil = willLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil,
        },
      });

      await AuditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        description: `Failed login attempt (${attempts}/5)`,
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset failed attempts upon successful authentication
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Resolve active organization membership
    let activeMembership = user.memberships[0];

    if (input.organizationSlug) {
      const matched = user.memberships.find(
        (m) => m.organization.slug === input.organizationSlug
      );
      if (matched) {
        activeMembership = matched;
      }
    }

    const tokenFamily = generateRandomToken(16);
    const rawRefreshToken = generateRandomToken(40);
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        organizationId: activeMembership?.organizationId,
        tokenFamily,
        hashedRefreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeOrganizationId: activeMembership?.organizationId,
      activeRole: activeMembership?.role.slug,
    });

    const refreshTokenJwt = signRefreshToken({
      userId: user.id,
      tokenFamily,
    });

    await AuditService.log({
      organizationId: activeMembership?.organizationId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      description: `User ${user.email} authenticated successfully`,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
      },
      activeOrganization: activeMembership
        ? {
            id: activeMembership.organization.id,
            name: activeMembership.organization.name,
            slug: activeMembership.organization.slug,
            logoUrl: activeMembership.organization.logoUrl,
            role: {
              id: activeMembership.role.id,
              name: activeMembership.role.name,
              slug: activeMembership.role.slug,
              permissions: activeMembership.role.permissions.map((rp) => rp.permission.code),
            },
          }
        : null,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role.name,
      })),
      accessToken,
      refreshToken: `${rawRefreshToken}.${refreshTokenJwt}`,
    };
  }

  /**
   * Refresh Token rotation with automatic reuse detection
   */
  public static async refreshAccessToken(
    combinedToken: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const parts = combinedToken.split('.');
    if (parts.length < 2) {
      throw new UnauthorizedError('Malformed refresh token');
    }

    const rawToken = parts[0];
    const jwtString = parts.slice(1).join('.');

    let decodedJwt;
    try {
      decodedJwt = verifyRefreshToken(jwtString);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token token signature');
    }

    const hashed = hashToken(rawToken);

    // Find the session record
    const session = await prisma.refreshSession.findFirst({
      where: {
        userId: decodedJwt.userId,
        tokenFamily: decodedJwt.tokenFamily,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: 'ACTIVE' },
              include: {
                organization: true,
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedError('Session not found or already terminated');
    }

    // Token Reuse Detection
    if (session.isRevoked || session.hashedRefreshToken !== hashed) {
      // SECURITY: Revoke ALL sessions belonging to this token family!
      await prisma.refreshSession.updateMany({
        where: { tokenFamily: decodedJwt.tokenFamily },
        data: { isRevoked: true },
      });

      await AuditService.log({
        organizationId: session.organizationId,
        userId: session.userId,
        action: AuditAction.TOKEN_REUSE_DETECTED,
        entityType: 'RefreshSession',
        entityId: session.id,
        description: 'Possible token theft or replay detected. Family sessions revoked.',
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedError('Security notice: Refresh token reuse detected. Please log in again.');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh session has expired');
    }

    // Revoke current token and generate next token in rotation
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const newRawToken = generateRandomToken(40);
    const newHashed = hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshSession.create({
      data: {
        userId: session.userId,
        organizationId: session.organizationId,
        tokenFamily: session.tokenFamily,
        hashedRefreshToken: newHashed,
        expiresAt: newExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Find active membership matching session organization
    const activeMembership = session.user.memberships.find(
      (m) => m.organizationId === session.organizationId
    ) || session.user.memberships[0];

    const newAccessToken = signAccessToken({
      userId: session.user.id,
      email: session.user.email,
      isSuperAdmin: session.user.isSuperAdmin,
      activeOrganizationId: activeMembership?.organizationId,
      activeRole: activeMembership?.role.slug,
    });

    const newRefreshTokenJwt = signRefreshToken({
      userId: session.user.id,
      tokenFamily: session.tokenFamily,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: `${newRawToken}.${newRefreshTokenJwt}`,
    };
  }

  /**
   * Switch the active organization context for a multi-organization user
   */
  public static async switchOrganization(
    userId: string,
    input: SwitchOrganizationInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: input.organizationId,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have active membership in the selected organization');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeOrganizationId: membership.organizationId,
      activeRole: membership.role.slug,
    });

    await AuditService.log({
      organizationId: membership.organizationId,
      userId,
      action: AuditAction.ORGANIZATION_SWITCH,
      entityType: 'Organization',
      entityId: membership.organizationId,
      description: `User switched active context to '${membership.organization.name}'`,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      activeOrganization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: {
          id: membership.role.id,
          name: membership.role.name,
          slug: membership.role.slug,
          permissions: membership.role.permissions.map((rp) => rp.permission.code),
        },
      },
    };
  }

  /**
   * Terminate current session
   */
  public static async logout(combinedToken?: string, userId?: string) {
    if (combinedToken) {
      const parts = combinedToken.split('.');
      if (parts.length >= 2) {
        const rawToken = parts[0];
        const hashed = hashToken(rawToken);
        await prisma.refreshSession.updateMany({
          where: { hashedRefreshToken: hashed },
          data: { isRevoked: true },
        });
      }
    }

    if (userId) {
      await AuditService.log({
        userId,
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: userId,
        description: 'User logged out',
      });
    }
  }
}
