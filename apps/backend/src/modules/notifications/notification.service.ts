import { prisma } from '../../config/prisma';
import { NotificationType } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  recipientEmail?: string;
}

export class NotificationService {
  /**
   * Dispatch an in-app notification & optional transactional email
   */
  public static async notify(params: CreateNotificationParams): Promise<void> {
    try {
      const notification = await prisma.notification.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || NotificationType.SYSTEM,
          link: params.link,
        },
      });

      // Transactional email dispatch channel (ready for SendGrid/Resend)
      if (params.recipientEmail) {
        logger.info(
          `[Email Transport Dispatch] To: ${params.recipientEmail} | Subject: [CodeOrbit] ${params.title} | Body: ${params.message}`
        );
      }

      logger.info(`Notification created for user ${params.userId}: ${notification.title}`);
    } catch (error) {
      // Never block primary business operations if notification delivery fails
      logger.error('Failed to create notification:', error);
    }
  }

  /**
   * List authenticated user's notifications
   */
  public static async listUserNotifications(
    organizationId: string,
    userId: string,
    unreadOnly = false
  ) {
    const where: any = { organizationId, userId };
    if (unreadOnly) where.isRead = false;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get count of unread notifications for bell badge
   */
  public static async getUnreadCount(organizationId: string, userId: string) {
    const count = await prisma.notification.count({
      where: { organizationId, userId, isRead: false },
    });
    return { count };
  }

  /**
   * Mark single notification as read
   */
  public static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for current user in organization
   */
  public static async markAllAsRead(organizationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
