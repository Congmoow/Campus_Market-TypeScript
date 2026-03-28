import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginRequest, RegisterRequest, ResetPasswordRequest } from '../types/shared';
import { successResponse } from '../utils/response.util';

/**
 * 璁よ瘉鎺у埗鍣?
 * 澶勭悊璁よ瘉鐩稿叧鐨?HTTP 璇锋眰
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * 鐢ㄦ埛娉ㄥ唽
   * POST /api/auth/register
   */
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      const result = await this.authService.register(data);
      res.json(successResponse(result, '娉ㄥ唽鎴愬姛'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 鐢ㄦ埛鐧诲綍
   * POST /api/auth/login
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: LoginRequest = req.body;
      const result = await this.authService.login(data);
      res.json(successResponse(result, '鐧诲綍鎴愬姛'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 鑾峰彇褰撳墠鐢ㄦ埛淇℃伅
   * GET /api/auth/me
   */
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

  /**
   * 閲嶇疆瀵嗙爜
   * POST /api/auth/reset-password
   */
  resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const data: ResetPasswordRequest = req.body;
      await this.authService.resetPassword(userId, data);
      res.json(successResponse(null, '瀵嗙爜閲嶇疆鎴愬姛'));
    } catch (error) {
      next(error);
    }
  };
}
