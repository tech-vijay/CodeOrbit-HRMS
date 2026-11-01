import { TokenPayload } from '../utils/jwt';

export interface TenantContext {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  membershipId: string;
  roleId: string;
  roleSlug: string;
  roleName: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenant?: TenantContext;
    }
  }
}
