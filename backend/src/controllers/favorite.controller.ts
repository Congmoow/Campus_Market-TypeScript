import { Request, Response, NextFunction } from 'express';
import { FavoriteService } from '../services/favorite.service';
import { successResponse } from '../utils/response.util';

export class FavoriteController {
  private favoriteService: FavoriteService;

  constructor() {
    this.favoriteService = new FavoriteService();
  }

  /**
   * 获取我的收藏列表
   * GET /api/favorites
   */
  getMyFavorites = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const favorites = await this.favoriteService.getUserFavorites(userId);
      res.json(successResponse(favorites));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 添加收藏
   * POST /api/favorites/:productId
   */
  addFavorite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const productId = Number(req.params.productId);
      const favorite = await this.favoriteService.addFavorite(userId, productId);
      res.json(successResponse(favorite, '收藏成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取消收藏
   * DELETE /api/favorites/:productId
   */
  removeFavorite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const productId = Number(req.params.productId);
      await this.favoriteService.removeFavorite(userId, productId);
      res.json(successResponse(null, '取消收藏成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 检查是否已收藏
   * GET /api/favorites/check/:productId
   */
  checkFavorite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const productId = Number(req.params.productId);
      const isFavorited = await this.favoriteService.isFavorited(userId, productId);
      res.json(successResponse({ isFavorited }));
    } catch (error) {
      next(error);
    }
  };
}
