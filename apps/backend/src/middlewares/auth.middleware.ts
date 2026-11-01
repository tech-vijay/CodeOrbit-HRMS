import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/prisma';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required: Missing access token');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    // Verify user still exists and is in active status
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, isSuperAdmin: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or no longer exists');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeOrganizationId: payload.activeOrganizationId,
      activeRole: payload.activeRole,
    };

    next();
  } catch (error) {
    next(error);
  }
};
