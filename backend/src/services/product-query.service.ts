import type { PageResponse, ProductListItem, ProductWithDetails } from '@campus-market/shared';
import { ProductStatus } from '@campus-market/shared';
import type { Prisma } from '@prisma/client';
import { sortCategoryEntitiesByDefaultOrder } from '../constants/product-categories';
import { mapCategory } from '../mappers/shared.mapper';
import { NotFoundException } from '../utils/error.util';
import { prisma } from '../utils/prisma.util';
import { ProductMapper } from './product.mapper';

type ProductListParams = {
  categoryId?: number;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page: number;
  size: number;
};

export class ProductQueryService {
  constructor(private readonly productMapper = new ProductMapper()) {}

  async getLatestProducts(limit = 20): Promise<ProductListItem[]> {
    const products = await prisma.product.findMany({
      where: { status: ProductStatus.ON_SALE },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        images: true,
      },
    });

    const lookup = await this.productMapper.loadSellerLookup(products);
    return Promise.all(
      products.map((product) => this.productMapper.convertProduct(product, false, lookup)),
    );
  }

  async getProductList(params: ProductListParams): Promise<PageResponse<ProductListItem>> {
    const { categoryId, keyword, minPrice, maxPrice, sort, page, size } = params;

    const where: Prisma.ProductWhereInput = { status: ProductStatus.ON_SALE };
    if (categoryId) where.categoryId = BigInt(categoryId);
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'priceAsc'
        ? { price: 'asc' }
        : sort === 'priceDesc'
          ? { price: 'desc' }
          : sort === 'viewDesc'
            ? { viewCount: 'desc' }
            : { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: page * size,
        take: size,
        include: {
          images: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const lookup = await this.productMapper.loadSellerLookup(products);
    const content = await Promise.all(
      products.map((product) => this.productMapper.convertProduct(product, false, lookup)),
    );

    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size,
      number: page,
    };
  }

  async getProductDetail(productId: number): Promise<ProductWithDetails> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: {
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    return this.productMapper.convertProduct(product, true) as Promise<ProductWithDetails>;
  }

  async getCategoryList(): Promise<Array<{ id: number; name: string; icon?: string }>> {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    return sortCategoryEntitiesByDefaultOrder(categories).map(mapCategory);
  }

  async getUserProducts(userId: number): Promise<ProductListItem[]> {
    const products = await prisma.product.findMany({
      where: {
        sellerId: BigInt(userId),
        status: { not: ProductStatus.DELETED },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
      },
    });

    const lookup = await this.productMapper.loadSellerLookup(products);
    return Promise.all(
      products.map((product) => this.productMapper.convertProduct(product, false, lookup)),
    );
  }
}
