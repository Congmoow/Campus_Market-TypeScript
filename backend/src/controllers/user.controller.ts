import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { UpdateProfileRequest } from '../types/shared';
import { successResponse } from '../utils/response.util';

/**
 * 用户控制器
 * 处理用户相关的 HTTP 请求
 */
export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * 获取用户资料
   * GET /api/users/:userId
   */
  getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.userId);
      const user = await this.userService.getUserProfile(userId);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取我的商品列表（需要认证）
   * GET /api/users/me/products?status=ON_SALE|SOLD|ALL
   */
  getMyProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string | undefined;
      const products = await this.userService.getUserProducts(userId, status);
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新用户资料（需要认证）
   * PUT /api/users/me
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data: UpdateProfileRequest = req.body;
      const user = await this.userService.updateUserProfile(userId, data);
      res.json(successResponse(user, '资料更新成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取用户的商品列表
   * GET /api/users/:userId/products?status=ON_SALE|SOLD|ALL
   */
  getUserProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.userId);
      const status = req.query.status as string | undefined;
      const products = await this.userService.getUserProducts(userId, status);
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  };
}
