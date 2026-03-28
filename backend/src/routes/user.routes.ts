import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

/**
 * 用户路由
 */

// 获取我的商品列表（需要认证）- 必须放在 /:userId 之前
router.get('/me/products', authenticate, userController.getMyProducts);

// 更新用户资料（需要认证）
router.put('/me', authenticate, userController.updateProfile);

// 获取用户资料（公开）
router.get('/:userId', userController.getUserProfile);

// 获取用户的商品列表（公开）
router.get('/:userId/products', userController.getUserProducts);

export default router;
