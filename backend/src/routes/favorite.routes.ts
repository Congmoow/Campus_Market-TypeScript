import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const favoriteController = new FavoriteController();

/**
 * 收藏路由（所有路由都需要认证）
 */

// 获取我的收藏列表
router.get('/', authenticate, favoriteController.getMyFavorites);

// 检查是否已收藏
router.get('/check/:productId', authenticate, favoriteController.checkFavorite);

// 添加收藏
router.post('/:productId', authenticate, favoriteController.addFavorite);

// 取消收藏
router.delete('/:productId', authenticate, favoriteController.removeFavorite);

export default router;
