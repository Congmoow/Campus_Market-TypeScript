import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  uploadAvatar,
  uploadProductImage,
  uploadProductImages,
  uploadChatImage,
  handleMulterError,
} from '../middlewares/upload.middleware';

const router = Router();
const fileController = new FileController();

/**
 * 文件上传路由（所有路由都需要认证）
 */

// 上传头像
router.post(
  '/avatar',
  authenticate,
  uploadAvatar,
  handleMulterError,
  fileController.uploadAvatar
);

// 上传单张商品图片
router.post(
  '/product',
  authenticate,
  uploadProductImage,
  handleMulterError,
  fileController.uploadProductImage
);

// 批量上传商品图片
router.post(
  '/products',
  authenticate,
  uploadProductImages,
  handleMulterError,
  fileController.uploadProductImages
);

// 上传聊天图片
router.post(
  '/chat',
  authenticate,
  uploadChatImage,
  handleMulterError,
  fileController.uploadChatImage
);

export default router;
