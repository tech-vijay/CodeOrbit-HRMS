import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendCreated, sendSuccess } from '../../utils/response';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export class AuthController {
  public static async registerOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.registerOrganization(req.body, ip, userAgent);

      res.cookie('refresh_token', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.cookie('access_token', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      sendCreated(res, 'Organization and administrator account registered successfully', result);
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login(req.body, ip, userAgent);

      res.cookie('refresh_token', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie('access_token', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      sendSuccess(res, 'Authentication successful', result);
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const token = req.cookies.refresh_token || req.body.refreshToken;
      if (!token) {
        res.status(401).json({ success: false, message: 'Refresh token not found' });
        return;
      }

      const result = await AuthService.refreshAccessToken(token, ip, userAgent);

      res.cookie('refresh_token', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie('access_token', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      sendSuccess(res, 'Access token refreshed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  public static async switchOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.switchOrganization(
        req.user!.userId,
        req.body,
        ip,
        userAgent
      );

      res.cookie('access_token', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      });

      sendSuccess(res, 'Switched active organization context', result);
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.refresh_token || req.body.refreshToken;
      const userId = req.user?.userId;

      await AuthService.logout(token, userId);

      res.clearCookie('refresh_token', COOKIE_OPTIONS);
      res.clearCookie('access_token', COOKIE_OPTIONS);

      sendSuccess(res, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          isSuperAdmin: true,
          memberships: {
            where: { status: 'ACTIVE' },
            include: {
              organization: true,
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User profile not found' });
        return;
      }

      const activeOrgId = req.user!.activeOrganizationId;
      const activeMembership =
        user.memberships.find((m) => m.organizationId === activeOrgId) ||
        user.memberships[0];

      sendSuccess(res, 'User profile fetched successfully', {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          isSuperAdmin: user.isSuperAdmin,
        },
        activeOrganization: activeMembership
          ? {
              id: activeMembership.organization.id,
              name: activeMembership.organization.name,
              slug: activeMembership.organization.slug,
              logoUrl: activeMembership.organization.logoUrl,
              role: {
                id: activeMembership.role.id,
                name: activeMembership.role.name,
                slug: activeMembership.role.slug,
                permissions: activeMembership.role.permissions.map((rp) => rp.permission.code),
              },
            }
          : null,
        memberships: user.memberships.map((m) => ({
          organizationId: m.organization.id,
          organizationName: m.organization.name,
          organizationSlug: m.organization.slug,
          role: m.role.name,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
