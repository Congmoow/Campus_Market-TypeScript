import path from 'path';
import fs from 'fs';
import type { UploadResponse } from '@campus-market/shared';
import { BusinessException } from '../utils/error.util';

export class FileService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.ensureUploadDirs();
  }

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

  private validateFileType(file: Express.Multer.File, allowedTypes: string[]): void {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw new BusinessException(
        `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`
      );
    }
  }

  private validateFileSize(file: Express.Multer.File, maxSizeMB: number): void {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BusinessException(`文件大小不能超过 ${maxSizeMB}MB`);
    }
  }

  async uploadAvatar(file: Express.Multer.File): Promise<UploadResponse> {
    this.validateFileType(file, ['.jpg', '.jpeg', '.png', '.gif', '.webp']);
    this.validateFileSize(file, 5);

    return {
      url: `/uploads/avatars/${file.filename}`,
      filename: file.filename,
    };
  }

  async uploadProductImage(file: Express.Multer.File): Promise<UploadResponse> {
    this.validateFileType(file, ['.jpg', '.jpeg', '.png', '.gif', '.webp']);
    this.validateFileSize(file, 10);

    return {
      url: `/uploads/products/${file.filename}`,
      filename: file.filename,
    };
  }

  async uploadChatImage(file: Express.Multer.File): Promise<UploadResponse> {
    this.validateFileType(file, ['.jpg', '.jpeg', '.png', '.gif', '.webp']);
    this.validateFileSize(file, 5);

    return {
      url: `/uploads/chat/${file.filename}`,
      filename: file.filename,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const actualPath = filePath.startsWith('/uploads/')
        ? filePath.substring(1)
        : filePath;

      const fullPath = path.join(process.cwd(), actualPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
    }
  }
}
