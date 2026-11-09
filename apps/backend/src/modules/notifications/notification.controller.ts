import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { sendSuccess } from '../../utils/response';

export class NotificationController {
  public static async listMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const userId = req.user!.userId;
      const unreadOnly = req.query.unread === 'true';

      const notifications = await NotificationService.listUserNotifications(
        organizationId,
        userId,
        unreadOnly
      );
      sendSuccess(res, 'Notifications retrieved', notifications);
    } catch (error) {
      next(error);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const userId = req.user!.userId;

      const result = await NotificationService.getUnreadCount(organizationId, userId);
      sendSuccess(res, 'Unread count retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await NotificationService.markAsRead(id, userId);
      sendSuccess(res, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  public static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenant!.organizationId;
      const userId = req.user!.userId;

      await NotificationService.markAllAsRead(organizationId, userId);
      sendSuccess(res, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
