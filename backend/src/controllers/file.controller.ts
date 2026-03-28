import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/file.service';
import { successResponse } from '../utils/response.util';
import { BusinessException } from '../utils/error.util';

export class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  /**
   * 上传头像
   * POST /api/upload/avatar
   */
  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BusinessException('请选择要上传的文件');
      }

      const result = await this.fileService.uploadAvatar(req.file);
      res.json(successResponse(result, '头像上传成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 上传商品图片
   * POST /api/upload/product
   */
  uploadProductImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BusinessException('请选择要上传的文件');
      }

      const result = await this.fileService.uploadProductImage(req.file);
      res.json(successResponse(result, '商品图片上传成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 上传聊天图片
   * POST /api/upload/chat
   */
  uploadChatImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BusinessException('请选择要上传的文件');
      }

      const result = await this.fileService.uploadChatImage(req.file);
      res.json(successResponse(result, '聊天图片上传成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 批量上传商品图片
   * POST /api/upload/products
   */
  uploadProductImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new BusinessException('请选择要上传的文件');
      }

      const results = await Promise.all(
        req.files.map((file) => this.fileService.uploadProductImage(file))
      );

      res.json(successResponse(results, '商品图片批量上传成功'));
    } catch (error) {
      next(error);
    }
  };
}
