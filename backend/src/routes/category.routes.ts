import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';

const router = Router();
const productController = new ProductController();

/**
 * 分类路由
 */

// 获取分类列表（公开）
router.get('/', productController.getCategoryList);

export default router;
