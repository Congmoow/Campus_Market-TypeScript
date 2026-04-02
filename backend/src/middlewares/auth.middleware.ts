import { Request, Response, NextFunction } from 'express';
import type { AuthTokenPayload } from '@campus-market/shared';
import { verifyToken } from '../utils/jwt.util';
import { UnauthorizedException } from '../utils/error.util';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('认证令牌格式错误');
    }

    req.user = verifyToken(parts[1]);
    next();
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      next(error);
      return;
    }

    next(new UnauthorizedException('认证令牌无效或已过期'));
  }
};

export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        req.user = verifyToken(parts[1]);
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    if (req.user.role !== 'ADMIN') {
      throw new UnauthorizedException('需要管理员权限');
    }

    next();
  } catch (error) {
    next(error);
  }
};
