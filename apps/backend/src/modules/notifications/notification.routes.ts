import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenantContext } from '../../middlewares/tenant.middleware';
import { NotificationController } from './notification.controller';

export const notificationRouter = Router();

// Enforce authentication & tenant boundary across all notification endpoints
notificationRouter.use(authenticate, resolveTenantContext);

notificationRouter.get('/', NotificationController.listMyNotifications);
notificationRouter.get('/unread-count', NotificationController.getUnreadCount);
notificationRouter.patch('/:id/read', NotificationController.markAsRead);
notificationRouter.post('/mark-all-read', NotificationController.markAllAsRead);
