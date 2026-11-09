export const hasWildcardPermissions = (permissions: readonly string[] | undefined): boolean =>
  Boolean(permissions?.some((granted) => ['*', 'all'].includes(granted.trim().toLowerCase())));

export const hasPermission = (
  permissions: readonly string[] | undefined,
  permission: string,
  role?: string | null,
  isSuperAdmin = false
): boolean =>
  Boolean(
    hasWildcardPermissions(permissions) ||
      hasElevatedRoleAccess(role, isSuperAdmin) ||
      permissions?.includes(permission)
  );

export const hasAnyPermission = (
  permissions: readonly string[] | undefined,
  requiredPermissions: readonly string[]
): boolean => requiredPermissions.some((permission) => hasPermission(permissions, permission));

export const isEmployeeOnlyRole = (role?: string | null): boolean => {
  const normalizedRole = role?.trim().toLowerCase().replace(/[_-]+/g, ' ');
  return normalizedRole === 'employee' || normalizedRole === 'staff';
};

export const hasElevatedRoleAccess = (
  role?: string | null,
  isSuperAdmin = false
): boolean => isSuperAdmin || Boolean(role?.trim() && !isEmployeeOnlyRole(role));

export const hasAdminPermission = (
  role: string | null | undefined,
  permissions: readonly string[] | undefined,
  permission: string,
  isSuperAdmin = false
): boolean => {
  if (isEmployeeOnlyRole(role) && !isSuperAdmin && !hasWildcardPermissions(permissions)) return false;
  return hasPermission(permissions, permission, role, isSuperAdmin);
};
