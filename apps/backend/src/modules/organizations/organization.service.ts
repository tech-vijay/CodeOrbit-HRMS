import { prisma } from '../../config/prisma';
import {
  UpdateOrganizationInput,
  CreateDepartmentInput,
  CreateDesignationInput,
  InviteMemberInput,
} from './organization.schemas';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { generateRandomToken, hashPassword, hashToken } from '../../utils/crypto';
import { env } from '../../config/env';

export class OrganizationService {
  /**
   * Get current organization profile
   */
  public static async getProfile(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            memberships: true,
            employees: true,
            departments: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  }

  /**
   * Update organization settings (guaranteed tenant-isolated)
   */
  public static async updateProfile(
    organizationId: string,
    userId: string,
    input: UpdateOrganizationInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const current = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!current) {
      throw new NotFoundError('Organization not found');
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: input,
    });

    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Organization',
      entityId: organizationId,
      description: 'Organization settings updated',
      oldValues: current,
      newValues: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * List organization roles
   */
  public static async getRoles(organizationId: string) {
    return prisma.role.findMany({
      where: {
        OR: [
          { organizationId },
          { isSystemRole: true, organizationId: null },
        ],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * List departments
   */
  public static async getDepartments(organizationId: string) {
    return prisma.department.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create department with tenant scope
   */
  public static async createDepartment(
    organizationId: string,
    userId: string,
    input: CreateDepartmentInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const exists = await prisma.department.findFirst({
      where: {
        organizationId,
        code: input.code,
      },
    });

    if (exists) {
      throw new ConflictError(`Department code '${input.code}' already exists in your organization`);
    }

    const dept = await prisma.department.create({
      data: {
        organizationId,
        name: input.name,
        code: input.code,
        description: input.description,
      },
    });

    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Department',
      entityId: dept.id,
      description: `Department '${dept.name}' (${dept.code}) created`,
      ipAddress,
      userAgent,
    });

    return dept;
  }

  /**
   * List designations
   */
  public static async getDesignations(organizationId: string) {
    return prisma.designation.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Create designation with tenant scope
   */
  public static async createDesignation(
    organizationId: string,
    userId: string,
    input: CreateDesignationInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const exists = await prisma.designation.findFirst({
      where: {
        organizationId,
        code: input.code,
      },
    });

    if (exists) {
      throw new ConflictError(`Designation code '${input.code}' already exists in your organization`);
    }

    const desig = await prisma.designation.create({
      data: {
        organizationId,
        title: input.title,
        code: input.code,
        description: input.description,
      },
    });

    await AuditService.log({
      organizationId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Designation',
      entityId: desig.id,
      description: `Designation '${desig.title}' created`,
      ipAddress,
      userAgent,
    });

    return desig;
  }

  /**
   * List members
   */
  public static async getMembers(organizationId: string) {
    return prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * Invite or add a member to the organization
   */
  public static async inviteMember(
    organizationId: string,
    inviterId: string,
    input: InviteMemberInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Verify role belongs to organization or is valid system role
    const role = await prisma.role.findFirst({
      where: {
        id: input.roleId,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });

    if (!role) {
      throw new BadRequestError('Invalid role specified');
    }

    // 2. Find or create user
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (user) {
      const existingMembership = await prisma.membership.findFirst({
        where: {
          organizationId,
          userId: user.id,
        },
      });

      if (existingMembership && existingMembership.status === 'INVITED') {
        const previousInvitation = await prisma.memberInvitation.findUnique({
          where: { membershipId: existingMembership.id },
          select: { acceptedAt: true, expiresAt: true },
        });
        if (
          previousInvitation &&
          !previousInvitation.acceptedAt &&
          previousInvitation.expiresAt > new Date()
        ) {
          throw new ConflictError('A valid invitation has already been sent to this user');
        }
      } else if (existingMembership && existingMembership.status !== 'REVOKED') {
        throw new ConflictError('User is already a member of this organization');
      }
      if (user.status !== 'ACTIVE' && user.status !== 'PENDING_VERIFICATION') {
        throw new BadRequestError('This user account is not eligible for an invitation');
      }
    }

    const rawToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const pendingPasswordHash = user ? undefined : await hashPassword(generateRandomToken(32));
    const result = await prisma.$transaction(async (tx) => {
      const invitedUser =
        user ??
        (await tx.user.create({
          data: {
            email: input.email.toLowerCase(),
            passwordHash: pendingPasswordHash!,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            status: 'PENDING_VERIFICATION',
          },
        }));
      const existingMembership = await tx.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: invitedUser.id } },
      });
      const invitedMembership = existingMembership
        ? await tx.membership.update({
            where: { id: existingMembership.id },
            data: { roleId: role.id, status: 'INVITED' },
          })
        : await tx.membership.create({
            data: {
              organizationId,
              userId: invitedUser.id,
              roleId: role.id,
              status: 'INVITED',
            },
          });

      const previousInvitation = await tx.memberInvitation.findUnique({
        where: { membershipId: invitedMembership.id },
        select: { id: true },
      });
      const invitationData = {
        organizationId,
        membershipId: invitedMembership.id,
        userId: invitedUser.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
        acceptedAt: null,
      };
      if (previousInvitation) {
        await tx.memberInvitation.update({
          where: { id: previousInvitation.id },
          data: invitationData,
        });
      } else {
        await tx.memberInvitation.create({ data: invitationData });
      }
      return { membership: invitedMembership, user: invitedUser };
    });

    await AuditService.log({
      organizationId,
      userId: inviterId,
      action: AuditAction.CREATE,
      entityType: 'Membership',
      entityId: result.membership.id,
      description: `Invited user ${result.user.email} as ${role.name}`,
      ipAddress,
      userAgent,
    });

    const invitationUrl = new URL('/accept-invitation', env.CORS_ORIGIN);
    invitationUrl.searchParams.set('token', rawToken);

    return {
      membership: {
        ...result.membership,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone,
          status: result.user.status,
        },
        role: { id: role.id, name: role.name, slug: role.slug },
      },
      invitationUrl: invitationUrl.toString(),
      expiresAt,
    };
  }

  /**
   * Fetch tenant-scoped audit logs
   */
  public static async getAuditLogs(organizationId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
