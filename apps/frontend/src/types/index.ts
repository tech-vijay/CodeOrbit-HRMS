export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  role?: string;
}

export interface OrganizationRole {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: OrganizationRole;
}

export interface UserMembershipSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  _count?: {
    employees: number;
  };
}

export interface Designation {
  id: string;
  organizationId: string;
  title: string;
  code: string;
  description?: string;
  createdAt: string;
  _count?: {
    employees: number;
  };
}

export interface Member {
  id: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: string;
    avatarUrl?: string;
    lastLoginAt?: string;
  };
  role: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}
