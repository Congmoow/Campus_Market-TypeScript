import { Request, Response, NextFunction } from 'express';
import type {
  AccessTokenResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@campus-market/shared';
import { AuthService } from '../services/auth.service';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../utils/auth-cookie.util';
import { successResponse } from '../utils/response.util';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  private getSessionContext(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      const result = await this.authService.register(data, this.getSessionContext(req));
      setRefreshTokenCookie(res, result.refreshToken);
      res.json(
        successResponse(
          {
            token: result.accessToken,
            user: result.user,
          },
          '注册成功',
        ),
      );
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: LoginRequest = req.body;
      const result = await this.authService.login(data, this.getSessionContext(req));
      setRefreshTokenCookie(res, result.refreshToken);
      res.json(
        successResponse(
          {
            token: result.accessToken,
            user: result.user,
          },
          '登录成功',
        ),
      );
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.refresh(
        getRefreshTokenFromRequest(req) || '',
        this.getSessionContext(req),
      );
      setRefreshTokenCookie(res, result.refreshToken);
      res.json(
        successResponse<AccessTokenResponse>({
          token: result.accessToken,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout(getRefreshTokenFromRequest(req));
      clearRefreshTokenCookie(res);
      res.json(successResponse(null, '退出成功'));
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.authService.getCurrentUser(userId);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const data: ResetPasswordRequest = req.body;
      await this.authService.resetPassword(userId, data);
      res.json(successResponse(null, '密码修改成功'));
    } catch (error) {
      next(error);
    }
  };
}
