import { prisma } from '../../config/prisma';
import { AuditAction } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CreateAuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          description: params.description,
          oldValues: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : undefined,
          newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      logger.audit(params.action, {
        entity: params.entityType,
        id: params.entityId,
        user: params.userId,
        org: params.organizationId,
      });
    } catch (error) {
      // Never crash the primary business request if audit logging fails, but log severe error
      logger.error('Failed to create audit log entry:', error);
    }
  }
}
