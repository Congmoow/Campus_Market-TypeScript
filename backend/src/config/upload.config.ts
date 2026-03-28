import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');
const uploadRoot = path.resolve(projectRoot, process.env.UPLOAD_DIR || 'uploads');

export const uploadConfig = {
  // 上传目录
  uploadDir: uploadRoot,
  
  // 头像上传配置
  avatar: {
    destination: path.join(uploadRoot, 'avatars'),
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  },
  
  // 商品图片上传配置
  product: {
    destination: path.join(uploadRoot, 'products'),
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  },
  
  // 聊天图片上传配置
  chat: {
    destination: path.join(uploadRoot, 'chat'),
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  },
};

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFilename(originalname: string): string {
  const ext = getFileExtension(originalname);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}${ext}`;
}

/**
 * 验证文件类型
 */
export function isValidMimeType(mimetype: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimetype);
}

/**
 * 验证文件大小
 */
export function isValidFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}
