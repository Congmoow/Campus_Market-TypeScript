import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import {
  CreateProductRequest,
  UpdateProductRequest,
  UpdateProductStatusRequest,
} from '../types/shared';
import { successResponse } from '../utils/response.util';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * 获取最新商品列表
   * GET /api/products/latest
   */
  getLatest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const products = await this.productService.getLatestProducts(limit);
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取商品列表（支持分页、筛选、排序）
   * GET /api/products
   */
  getList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId, keyword, minPrice, maxPrice, sort, page = '0', size = '20' } = req.query;
      const result = await this.productService.getProductList({
        categoryId: categoryId ? Number(categoryId) : undefined,
        keyword: keyword as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort: sort as string,
        page: Number(page),
        size: Number(size),
      });
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取商品详情
   * GET /api/products/:id
   */
  getDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = Number(req.params.id);
      const product = await this.productService.getProductDetail(productId);
      res.json(successResponse(product));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 创建商品
   * POST /api/products
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data: CreateProductRequest = req.body;
      const product = await this.productService.createProduct(userId, data);
      res.json(successResponse(product, '商品创建成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新商品
   * PUT /api/products/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const productId = Number(req.params.id);
      const data: UpdateProductRequest = req.body;
      const product = await this.productService.updateProduct(userId, productId, data);
      res.json(successResponse(product, '商品更新成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除商品
   * DELETE /api/products/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const productId = Number(req.params.id);
      await this.productService.deleteProduct(userId, productId);
      res.json(successResponse(null, '商品删除成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新商品状态
   * PATCH /api/products/:id/status
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const productId = Number(req.params.id);
      const data: UpdateProductStatusRequest = req.body;
      const product = await this.productService.updateProductStatus(userId, productId, data);
      res.json(successResponse(product, '商品状态更新成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 增加浏览量
   * POST /api/products/:id/view
   */
  increaseView = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = Number(req.params.id);
      await this.productService.increaseViewCount(productId);
      res.json(successResponse(null, '浏览量增加成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取分类列表
   * GET /api/categories
   */
  getCategoryList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.productService.getCategoryList();
      res.json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取我的商品列表
   * GET /api/products/my
   */
  getMyProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const products = await this.productService.getUserProducts(userId);
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取用户的商品列表
   * GET /api/products/user/:userId
   */
  getUserProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.userId);
      const products = await this.productService.getUserProducts(userId);
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  };
}
