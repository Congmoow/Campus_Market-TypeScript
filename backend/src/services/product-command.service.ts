import type {
  CreateProductRequest,
  ProductWithDetails,
  UpdateProductRequest,
  UpdateProductStatusRequest,
} from '@campus-market/shared';
import { ProductStatus } from '@campus-market/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.util';
import { BusinessException, ForbiddenException, NotFoundException } from '../utils/error.util';
import { ProductCategoryService } from './product-category.service';
import { ProductQueryService } from './product-query.service';

export class ProductCommandService {
  constructor(
    private readonly productQueryService = new ProductQueryService(),
    private readonly productCategoryService = new ProductCategoryService(),
  ) {}

  async createProduct(userId: number, data: CreateProductRequest): Promise<ProductWithDetails> {
    if (data.price <= 0) {
      throw new BusinessException('价格必须大于0');
    }

    if (data.originalPrice != null && data.originalPrice < data.price) {
      throw new BusinessException('原价不能低于现价');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new BusinessException('商品标题不能为空');
    }

    if (!data.description || data.description.trim().length === 0) {
      throw new BusinessException('商品描述不能为空');
    }

    const categoryId = (await this.productCategoryService.resolveCategoryId(data)) ?? null;

    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        categoryId,
        location: data.location,
        sellerId: BigInt(userId),
        status: ProductStatus.ON_SALE,
        viewCount: BigInt(0),
        images: {
          create: (data.images || []).map((url) => ({ url })),
        },
      },
      include: {
        images: true,
      },
    });

    return this.productQueryService.getProductDetail(Number(product.id));
  }

  async updateProduct(
    userId: number,
    productId: number,
    data: UpdateProductRequest,
  ): Promise<ProductWithDetails> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (Number(product.sellerId) !== userId) {
      throw new ForbiddenException('无权修改此商品');
    }

    if (data.price !== undefined && data.price <= 0) {
      throw new BusinessException('价格必须大于0');
    }

    const nextPrice = data.price !== undefined ? data.price : Number(product.price);
    if (data.originalPrice != null && data.originalPrice < nextPrice) {
      throw new BusinessException('原价不能低于现价');
    }

    const updateData: Prisma.ProductUpdateInput = {};
    const resolvedCategoryId = await this.productCategoryService.resolveCategoryId(data);

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
    if (resolvedCategoryId !== undefined) updateData.categoryId = resolvedCategoryId;
    if (data.location !== undefined) updateData.location = data.location;

    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: updateData,
    });

    if (data.images !== undefined) {
      await prisma.productImage.deleteMany({
        where: { productId: BigInt(productId) },
      });

      if (data.images.length > 0) {
        await prisma.productImage.createMany({
          data: data.images.map((url) => ({
            productId: BigInt(productId),
            url,
          })),
        });
      }
    }

    return this.productQueryService.getProductDetail(productId);
  }

  async deleteProduct(userId: number, productId: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (Number(product.sellerId) !== userId) {
      throw new ForbiddenException('无权删除此商品');
    }

    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { status: ProductStatus.DELETED },
    });
  }

  async updateProductStatus(
    userId: number,
    productId: number,
    data: UpdateProductStatusRequest,
  ): Promise<ProductWithDetails> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (Number(product.sellerId) !== userId) {
      throw new ForbiddenException('无权修改此商品状态');
    }

    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { status: data.status },
    });

    return this.productQueryService.getProductDetail(productId);
  }

  async increaseViewCount(productId: number): Promise<void> {
    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { viewCount: { increment: 1 } },
    });
  }
}
