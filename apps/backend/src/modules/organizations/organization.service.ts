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
import { hashPassword } from '../../utils/crypto';

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
    let user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (user) {
      // Check if already member
      const existingMembership = await prisma.membership.findFirst({
        where: {
          organizationId,
          userId: user.id,
        },
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this organization');
      }
    } else {
      // Provision user with temporary secure password
      const defaultPasswordHash = await hashPassword('WelcomeOrbit@2026!');
      user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: defaultPasswordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          status: 'ACTIVE',
        },
      });
    }

    // 3. Create membership
    const membership = await prisma.membership.create({
      data: {
        organizationId,
        userId: user.id,
        roleId: role.id,
        status: 'ACTIVE',
      },
      include: {
        user: true,
        role: true,
      },
    });

    await AuditService.log({
      organizationId,
      userId: inviterId,
      action: AuditAction.CREATE,
      entityType: 'Membership',
      entityId: membership.id,
      description: `Invited user ${user.email} as ${role.name}`,
      ipAddress,
      userAgent,
    });

    return membership;
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
