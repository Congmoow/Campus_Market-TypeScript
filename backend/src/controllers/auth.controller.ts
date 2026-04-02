import { Request, Response, NextFunction } from 'express';
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@campus-market/shared';
import { AuthService } from '../services/auth.service';
import { successResponse } from '../utils/response.util';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      const result = await this.authService.register(data);
      res.json(successResponse(result, '注册成功'));
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: LoginRequest = req.body;
      const result = await this.authService.login(data);
      res.json(successResponse(result, '登录成功'));
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.authService.getCurrentUser(userId);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
