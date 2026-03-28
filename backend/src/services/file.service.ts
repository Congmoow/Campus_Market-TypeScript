import path from 'path';
import fs from 'fs';
import { UploadResponse } from '../types/shared';
import { BusinessException } from '../utils/error.util';

export class FileService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.ensureUploadDirs();
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDirs() {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'avatars'),
      path.join(this.uploadDir, 'products'),
      path.join(this.uploadDir, 'chat'),
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 验证文件类型
   */
  private validateFileType(file: Express.Multer.File, allowedTypes: string[]): void {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw new BusinessException(
        `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * 验证文件大小
   */
  private validateFileSize(file: Express.Multer.File, maxSizeMB: number): void {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BusinessException(`文件大小不能超过 ${maxSizeMB}MB`);
    }
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: Express.Multer.File): Promise<UploadResponse> {
    // 验证文件类型
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    this.validateFileType(file, allowedTypes);

    // 验证文件大小（最大 5MB）
    this.validateFileSize(file, 5);

    // 生成文件名
    const filename = file.filename;
    const url = `/uploads/avatars/${filename}`;

    return {
      url,
      filename,
    };
  }

  /**
   * 上传商品图片
   */
  async uploadProductImage(file: Express.Multer.File): Promise<UploadResponse> {
    // 验证文件类型
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    this.validateFileType(file, allowedTypes);

    // 验证文件大小（最大 10MB）
    this.validateFileSize(file, 10);

    // 生成文件名
    const filename = file.filename;
    const url = `/uploads/products/${filename}`;

    return {
      url,
      filename,
    };
  }

  /**
   * 上传聊天图片
   */
  async uploadChatImage(file: Express.Multer.File): Promise<UploadResponse> {
    // 验证文件类型
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    this.validateFileType(file, allowedTypes);

    // 验证文件大小（最大 5MB）
    this.validateFileSize(file, 5);

    // 生成文件名
    const filename = file.filename;
    const url = `/uploads/chat/${filename}`;

    return {
      url,
      filename,
    };
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      // 从 URL 路径转换为实际文件路径
      const actualPath = filePath.startsWith('/uploads/')
        ? filePath.substring(1)
        : filePath;

      const fullPath = path.join(process.cwd(), actualPath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      // 不抛出错误，因为文件可能已经被删除
    }
  }
}
