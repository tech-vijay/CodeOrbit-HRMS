export const hasPermission = (
  permissions: readonly string[] | undefined,
  permission: string
): boolean => Boolean(permissions?.includes('*') || permissions?.includes(permission));

export const hasAnyPermission = (
  permissions: readonly string[] | undefined,
  requiredPermissions: readonly string[]
): boolean => requiredPermissions.some((permission) => hasPermission(permissions, permission));
