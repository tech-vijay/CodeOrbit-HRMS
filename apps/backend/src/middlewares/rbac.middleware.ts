import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

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

    if (req.user?.isSuperAdmin || req.tenant.permissions.includes('*')) {
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
