import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { TenantContext } from '../types/express';

const normalizeRole = (role: string): string =>
  role.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const isPrivilegedTenantRole = (role: string): boolean =>
  ['company admin', 'company administrator', 'super admin', 'super administrator', 'hr manager'].includes(
    normalizeRole(role)
  );

export const hasFullTenantAccess = (
  tenant: Pick<TenantContext, 'roleSlug' | 'roleName' | 'permissions'> | undefined,
  isSuperAdmin = false
): boolean =>
  Boolean(
    isSuperAdmin ||
      isPrivilegedTenantRole(tenant?.roleSlug || '') ||
      isPrivilegedTenantRole(tenant?.roleName || '') ||
      tenant?.permissions.some((permission) => ['*', 'all'].includes(permission.trim().toLowerCase()))
  );

/**
 * Enforce Super Admin role
 */
export const requireSuperAdmin = () => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!req.user.isSuperAdmin) {
      return next(new ForbiddenError('Super Administrator privileges required'));
    }
    next();
  };
};

/**
 * Enforce specific role(s) within the tenant context
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return next(new ForbiddenError('Tenant context required for role verification'));
    }

    if (req.user?.isSuperAdmin) {
      return next();
    }

    if (!allowedRoles.includes(req.tenant.roleSlug)) {
      return next(
        new ForbiddenError(
          `Insufficient privileges: Role '${req.tenant.roleName}' is not authorized for this action`
        )
      );
    }

    next();
  };
};

/**
 * Enforce granular permission(s) within the tenant context
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return next(new ForbiddenError('Tenant context required for permission verification'));
    }

    if (hasFullTenantAccess(req.tenant, req.user?.isSuperAdmin)) {
      return next();
    }

    const hasAll = requiredPermissions.every((perm) =>
      req.tenant?.permissions.includes(perm)
    );

    if (!hasAll) {
      return next(
        new ForbiddenError(
          `Access denied: Missing required permission(s): ${requiredPermissions.join(', ')}`
        )
      );
    }

    next();
  };
};

export const requireAnyPermission = (...allowedPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return next(new ForbiddenError('Tenant context required for permission verification'));
    }

    if (
      hasFullTenantAccess(req.tenant, req.user?.isSuperAdmin) ||
      allowedPermissions.some((permission) => req.tenant?.permissions.includes(permission))
    ) {
      return next();
    }

    next(
      new ForbiddenError(
        `Access denied: Requires one of the following permissions: ${allowedPermissions.join(', ')}`
      )
    );
  };
};
