import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.util';
import { UnauthorizedException } from '../utils/error.util';

// 扩展 Express Request 类型以包含 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT 认证中间件
 * 验证请求头中的 JWT token，并将用户信息附加到 req.user
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    // 检查 Bearer token 格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('认证令牌格式错误');
    }

    const token = parts[1];

    // 验证 token
    const payload = verifyToken(token);
    
    // 将用户信息附加到请求对象
    req.user = payload;
    
    next();
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      next(error);
    } else {
      next(new UnauthorizedException('认证令牌无效或已过期'));
    }
  }
};

/**
 * 可选认证中间件
 * 如果提供了 token 则验证，否则继续执行
 */
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
        const token = parts[1];
        const payload = verifyToken(token);
        req.user = payload;
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败时不抛出错误，继续执行
    next();
  }
};

/**
 * 管理员权限验证中间件
 * 必须在 authenticate 中间件之后使用
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 检查用户是否已认证
    if (!req.user) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    // 检查用户角色
    if (req.user.role !== 'ADMIN') {
      throw new UnauthorizedException('需要管理员权限');
    }

    next();
  } catch (error) {
    next(error);
  }
};
