import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, TenantIsolationError, ForbiddenError } from '../utils/errors';
import { prisma } from '../config/prisma';

export const resolveTenantContext = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required before resolving tenant context');
    }

    // Determine target organization from header, query, body, or active token session
    const targetOrgId =
      (req.headers['x-tenant-id'] as string) ||
      (req.query.organizationId as string) ||
      req.user.activeOrganizationId;

    if (!targetOrgId) {
      throw new TenantIsolationError('Missing organization context: Organization ID not specified');
    }

    // If Super Admin, allow access and populate tenant context directly from organization record
    if (req.user.isSuperAdmin) {
      const org = await prisma.organization.findUnique({
        where: { id: targetOrgId },
      });

      if (!org || org.status !== 'ACTIVE') {
        throw new TenantIsolationError('Specified organization does not exist or is inactive');
      }

      req.tenant = {
        organizationId: org.id,
        organizationSlug: org.slug,
        organizationName: org.name,
        membershipId: 'super-admin-membership',
        roleId: 'super-admin-role',
        roleSlug: 'super_admin',
        roleName: 'Super Administrator',
        permissions: ['*'], // Super admin has universal permissions
      };

      return next();
    }

    // Standard Multi-Tenant Rule: Enforce server-side verified membership!
    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.user.userId,
        organizationId: targetOrgId,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!membership || membership.organization.status !== 'ACTIVE') {
      throw new TenantIsolationError(
        'Tenant isolation policy violation: User has no active membership in this organization'
      );
    }

    const permissions = membership.role.permissions.map((rp) => rp.permission.code);

    req.tenant = {
      organizationId: membership.organization.id,
      organizationSlug: membership.organization.slug,
      organizationName: membership.organization.name,
      membershipId: membership.id,
      roleId: membership.role.id,
      roleSlug: membership.role.slug,
      roleName: membership.role.name,
      permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
};
