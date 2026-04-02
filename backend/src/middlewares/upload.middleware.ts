import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import fs from 'fs';
import { uploadConfig, generateUniqueFilename, isValidMimeType } from '../config/upload.config';
import { ValidationException } from '../utils/error.util';

/**
 * 确保上传目录存在
 */
function ensureUploadDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 创建 Multer 存储配置
 */
function createStorage(destination: string) {
  ensureUploadDir(destination);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const uniqueFilename = generateUniqueFilename(file.originalname);
      cb(null, uniqueFilename);
    },
  });
}

/**
 * 创建文件过滤器
 */
function createFileFilter(allowedMimeTypes: string[]) {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (isValidMimeType(file.mimetype, allowedMimeTypes)) {
      cb(null, true);
    } else {
      cb(new ValidationException(`不支持的文件类型: ${file.mimetype}`));
    }
  };
}

/**
 * 头像上传中间件
 */
export const uploadAvatar = multer({
  storage: createStorage(uploadConfig.avatar.destination),
  fileFilter: createFileFilter(uploadConfig.avatar.allowedMimeTypes),
  limits: {
    fileSize: uploadConfig.avatar.maxSize,
  },
}).single('avatar');

/**
 * 商品图片上传中间件（支持多张）
 */
export const uploadProductImages = multer({
  storage: createStorage(uploadConfig.product.destination),
  fileFilter: createFileFilter(uploadConfig.product.allowedMimeTypes),
  limits: {
    fileSize: uploadConfig.product.maxSize,
    files: 9, // 最多 9 张图片
  },
}).array('images', 9);

/**
 * 单张商品图片上传中间件
 */
export const uploadProductImage = multer({
  storage: createStorage(uploadConfig.product.destination),
  fileFilter: createFileFilter(uploadConfig.product.allowedMimeTypes),
  limits: {
    fileSize: uploadConfig.product.maxSize,
  },
}).single('image');

/**
 * 聊天图片上传中间件
 */
export const uploadChatImage = multer({
  storage: createStorage(uploadConfig.chat.destination),
  fileFilter: createFileFilter(uploadConfig.chat.allowedMimeTypes),
  limits: {
    fileSize: uploadConfig.chat.maxSize,
  },
}).single('image');

/**
 * 处理 Multer 错误的中间件
 */
export const handleMulterError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ValidationException('文件大小超出限制'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ValidationException('文件数量超出限制'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationException('意外的文件字段'));
    }
    return next(new ValidationException(`文件上传错误: ${err.message}`));
  }
  next(err);
};
