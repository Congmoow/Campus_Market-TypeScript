import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();
const adminController = new AdminController();

/**
 * 管理员路由
 * 所有路由都需要管理员权限
 */

// 应用认证和管理员权限中间件到所有路由
router.use(authenticate, requireAdmin);

// 统计数据
router.get('/statistics', adminController.getStatistics);

// 用户管理
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

// 商品管理
router.get('/products', adminController.getAllProducts);
router.delete('/products/:productId', adminController.deleteProduct);

// 订单管理
router.get('/orders', adminController.getAllOrders);

// 分类管理
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.delete('/categories/:categoryId', adminController.deleteCategory);

export default router;
