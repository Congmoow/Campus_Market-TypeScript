import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { successResponse } from '../utils/response.util';

/**
 * 管理员控制器
 * 处理管理员相关的 HTTP 请求
 */
export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * 获取系统统计数据
   * GET /api/admin/statistics
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.adminService.getStatistics();
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取所有用户列表
   * GET /api/admin/users?page=1&pageSize=20&keyword=xxx
   */
  getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const keyword = req.query.keyword as string | undefined;
      
      const result = await this.adminService.getAllUsers(page, pageSize, keyword);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 切换用户启用状态
   * PUT /api/admin/users/:userId/toggle-status
   */
  toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.userId);
      const result = await this.adminService.toggleUserStatus(userId);
      res.json(successResponse(result, '用户状态已更新'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取所有商品列表
   * GET /api/admin/products?page=1&pageSize=20&keyword=xxx
   */
  getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const keyword = req.query.keyword as string | undefined;
      
      const result = await this.adminService.getAllProducts(page, pageSize, keyword);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除商品
   * DELETE /api/admin/products/:productId
   */
  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = Number(req.params.productId);
      await this.adminService.deleteProduct(productId);
      res.json(successResponse(null, '商品已删除'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取所有订单列表
   * GET /api/admin/orders?page=1&pageSize=20&keyword=xxx
   */
  getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const keyword = req.query.keyword as string | undefined;
      
      const result = await this.adminService.getAllOrders(page, pageSize, keyword);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取所有分类
   * GET /api/admin/categories
   */
  getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.adminService.getAllCategories();
      res.json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 创建分类
   * POST /api/admin/categories
   */
  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body;
      const category = await this.adminService.createCategory(name);
      res.json(successResponse(category, '分类创建成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除分类
   * DELETE /api/admin/categories/:categoryId
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = Number(req.params.categoryId);
      await this.adminService.deleteCategory(categoryId);
      res.json(successResponse(null, '分类已删除'));
    } catch (error) {
      next(error);
    }
  };
}
