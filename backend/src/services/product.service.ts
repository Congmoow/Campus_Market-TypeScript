import type {
  Category as PrismaCategory,
  Prisma,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  User as PrismaUser,
  UserProfile as PrismaUserProfile,
} from '@prisma/client';
import {
  CreateProductRequest,
  PageResponse,
  ProductListItem,
  ProductStatus,
  ProductWithDetails,
  UpdateProductRequest,
  UpdateProductStatusRequest,
  User,
} from '@campus-market/shared';
import { prisma } from '../utils/prisma.util';
import {
  mapCategory,
  mapProductBase,
  mapProductImage,
  mapUser,
} from '../mappers/shared.mapper';
import {
  BusinessException,
  ForbiddenException,
  NotFoundException,
} from '../utils/error.util';
import {
  DEFAULT_PRODUCT_CATEGORY_NAMES,
  sortCategoryEntitiesByDefaultOrder,
} from '../constants/product-categories';

type ProductRecord = PrismaProduct & {
  images: PrismaProductImage[];
};

type SellerLookup = {
  sellers: Map<string, PrismaUser>;
  profiles: Map<string, PrismaUserProfile>;
  categories?: Map<string, PrismaCategory>;
};

export class ProductService {
  private async resolveCategoryId(
    data: Pick<CreateProductRequest | UpdateProductRequest, 'categoryId' | 'categoryName'>
  ): Promise<bigint | null | undefined> {
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: { id: BigInt(data.categoryId) },
      });

      if (!category) {
        throw new BusinessException('分类不存在');
      }

      return BigInt(data.categoryId);
    }

    if (data.categoryName === undefined) {
      return undefined;
    }

    const normalizedCategoryName = data.categoryName?.trim();
    if (!normalizedCategoryName) {
      return null;
    }

    const existingCategory = await prisma.category.findFirst({
      where: { name: normalizedCategoryName },
    });

    if (existingCategory) {
      return existingCategory.id;
    }

    if (
      !DEFAULT_PRODUCT_CATEGORY_NAMES.includes(
        normalizedCategoryName as (typeof DEFAULT_PRODUCT_CATEGORY_NAMES)[number]
      )
    ) {
      throw new BusinessException('分类不存在');
    }

    const createdCategory = await prisma.category.create({
      data: { name: normalizedCategoryName },
    });

    return createdCategory.id;
  }

  private async loadSellerLookup(products: ProductRecord[]): Promise<SellerLookup> {
    const sellerIds = [...new Set(products.map((product) => product.sellerId))];
    if (sellerIds.length === 0) {
      return {
        sellers: new Map(),
        profiles: new Map(),
      };
    }

    const [sellers, sellerProfiles] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: sellerIds } },
      }),
      prisma.userProfile.findMany({
        where: { userId: { in: sellerIds } },
      }),
    ]);

    return {
      sellers: new Map(sellers.map((seller) => [seller.id.toString(), seller])),
      profiles: new Map(sellerProfiles.map((profile) => [profile.userId.toString(), profile])),
    };
  }

  private buildSeller(product: ProductRecord, lookup: SellerLookup): User {
    const seller = lookup.sellers.get(product.sellerId.toString());
    const sellerProfile = lookup.profiles.get(product.sellerId.toString());

    if (seller) {
      return mapUser(seller, sellerProfile);
    }

    return {
      id: Number(product.sellerId),
      studentId: '',
      phone: undefined,
      role: undefined,
      avatar: sellerProfile?.avatarUrl || undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      profile: sellerProfile
        ? {
            id: Number(sellerProfile.id),
            userId: Number(sellerProfile.userId),
            name: sellerProfile.name || undefined,
            studentId: sellerProfile.studentId || undefined,
            campus: sellerProfile.campus || undefined,
            avatarUrl: sellerProfile.avatarUrl || undefined,
            major: sellerProfile.major || undefined,
            grade: sellerProfile.grade || undefined,
            bio: sellerProfile.bio || undefined,
            nickname: sellerProfile.name || undefined,
            location: sellerProfile.campus || undefined,
          }
        : undefined,
    };
  }

  private async convertProduct(
    product: ProductRecord,
    includeCategory = false,
    preloaded?: SellerLookup
  ): Promise<ProductListItem | ProductWithDetails> {
    let lookup = preloaded;
    if (!lookup) {
      const [seller, sellerProfile] = await Promise.all([
        prisma.user.findUnique({
          where: { id: product.sellerId },
        }),
        prisma.userProfile.findFirst({
          where: { userId: product.sellerId },
        }),
      ]);

      lookup = {
        sellers: new Map(seller ? [[seller.id.toString(), seller]] : []),
        profiles: new Map(
          sellerProfile ? [[sellerProfile.userId.toString(), sellerProfile]] : []
        ),
      };
    }

    const result: ProductListItem | ProductWithDetails = {
      ...mapProductBase(product),
      images: (product.images ?? []).map(mapProductImage),
      seller: this.buildSeller(product, lookup),
    };

    if (includeCategory && product.categoryId) {
      const category =
        lookup.categories?.get(product.categoryId.toString()) ||
        (await prisma.category.findUnique({
          where: { id: product.categoryId },
        }));

      if (category) {
        (result as ProductWithDetails).category = mapCategory(category);
      }
    }

    return result;
  }

  async getLatestProducts(limit = 20): Promise<ProductListItem[]> {
    const products = await prisma.product.findMany({
      where: { status: ProductStatus.ON_SALE },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        images: true,
      },
    });

    const lookup = await this.loadSellerLookup(products);
    return Promise.all(products.map((product) => this.convertProduct(product, false, lookup)));
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

    const lookup = await this.loadSellerLookup(products);
    const content = await Promise.all(
      products.map((product) => this.convertProduct(product, false, lookup))
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

    return this.convertProduct(product, true) as Promise<ProductWithDetails>;
  }

  async createProduct(
    userId: number,
    data: CreateProductRequest
  ): Promise<ProductWithDetails> {
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

    const categoryId = (await this.resolveCategoryId(data)) ?? null;

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

    return this.getProductDetail(Number(product.id));
  }

  async updateProduct(
    userId: number,
    productId: number,
    data: UpdateProductRequest
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
    const resolvedCategoryId = await this.resolveCategoryId(data);

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

    return this.getProductDetail(productId);
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
    data: UpdateProductStatusRequest
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

    return this.getProductDetail(productId);
  }

  async increaseViewCount(productId: number): Promise<void> {
    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { viewCount: { increment: 1 } },
    });
  }

  async getCategoryList(): Promise<Array<{ id: number; name: string; icon?: string }>> {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    const existingCategoryNames = new Set(categories.map((category) => category.name));
    const missingDefaultCategories = DEFAULT_PRODUCT_CATEGORY_NAMES.filter(
      (name) => !existingCategoryNames.has(name)
    );

    const createdCategories = await Promise.all(
      missingDefaultCategories.map((name) =>
        prisma.category.create({
          data: { name },
        })
      )
    );

    return sortCategoryEntitiesByDefaultOrder([...categories, ...createdCategories]).map(
      mapCategory
    );
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

    const lookup = await this.loadSellerLookup(products);
    return Promise.all(products.map((product) => this.convertProduct(product, false, lookup)));
  }
}
