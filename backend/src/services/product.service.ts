import type {
  CreateProductRequest,
  PageResponse,
  ProductListItem,
  ProductWithDetails,
  UpdateProductRequest,
  UpdateProductStatusRequest,
} from '@campus-market/shared';
import { ProductCategoryService } from './product-category.service';
import { ProductCommandService } from './product-command.service';
import { ProductMapper } from './product.mapper';
import { ProductQueryService } from './product-query.service';

export class ProductService {
  private readonly queryService: ProductQueryService;
  private readonly commandService: ProductCommandService;

  constructor() {
    const categoryService = new ProductCategoryService();
    const mapper = new ProductMapper(categoryService);

    this.queryService = new ProductQueryService(mapper);
    this.commandService = new ProductCommandService(this.queryService, categoryService);
  }

  async getLatestProducts(limit = 20): Promise<ProductListItem[]> {
    return this.queryService.getLatestProducts(limit);
  }

  async getProductList(params: {
    categoryId?: number;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    size: number;
  }): Promise<PageResponse<ProductListItem>> {
    return this.queryService.getProductList(params);
  }

  async getProductDetail(productId: number): Promise<ProductWithDetails> {
    return this.queryService.getProductDetail(productId);
  }

  async createProduct(userId: number, data: CreateProductRequest): Promise<ProductWithDetails> {
    return this.commandService.createProduct(userId, data);
  }

  async updateProduct(
    userId: number,
    productId: number,
    data: UpdateProductRequest,
  ): Promise<ProductWithDetails> {
    return this.commandService.updateProduct(userId, productId, data);
  }

  async deleteProduct(userId: number, productId: number): Promise<void> {
    return this.commandService.deleteProduct(userId, productId);
  }

  async updateProductStatus(
    userId: number,
    productId: number,
    data: UpdateProductStatusRequest,
  ): Promise<ProductWithDetails> {
    return this.commandService.updateProductStatus(userId, productId, data);
  }

  async increaseViewCount(productId: number): Promise<void> {
    return this.commandService.increaseViewCount(productId);
  }

  async getCategoryList(): Promise<Array<{ id: number; name: string; icon?: string }>> {
    return this.queryService.getCategoryList();
  }

  async getUserProducts(userId: number): Promise<ProductListItem[]> {
    return this.queryService.getUserProducts(userId);
  }
}
