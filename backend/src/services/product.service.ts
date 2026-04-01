import { prisma } from '../utils/prisma.util';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductStatus,
  UpdateProductStatusRequest,
  PageResponse,
  ProductListItem,
  ProductWithDetails,
  User,
  UserProfile,
} from '../types/shared';
import { BusinessException, NotFoundException, ForbiddenException } from '../utils/error.util';
import {
  DEFAULT_PRODUCT_CATEGORY_NAMES,
  sortCategoryEntitiesByDefaultOrder,
} from '../constants/product-categories';

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

    if (!DEFAULT_PRODUCT_CATEGORY_NAMES.includes(normalizedCategoryName as (typeof DEFAULT_PRODUCT_CATEGORY_NAMES)[number])) {
      throw new BusinessException('分类不存在');
    }

    const createdCategory = await prisma.category.create({
      data: { name: normalizedCategoryName },
    });

    return createdCategory.id;
  }

  /**
   * 杞崲 Prisma Product 涓哄叡浜被鍨?
   * 浼樺寲锛氫娇鐢ㄩ鍔犺浇鐨勬暟鎹伩鍏?N+1 鏌ヨ
   */
  private async convertProduct(
    product: any,
    includeCategory: boolean = false,
    preloadedSellers?: Map<string, any>,
    preloadedProfiles?: Map<string, any>,
    preloadedCategories?: Map<string, any>
  ): Promise<any> {
    // 鑾峰彇鍗栧淇℃伅锛堜紭鍏堜娇鐢ㄩ鍔犺浇鏁版嵁锛?
    let seller = preloadedSellers?.get(product.sellerId.toString());
    let sellerProfile = preloadedProfiles?.get(product.sellerId.toString());

    if (!seller) {
      seller = await prisma.user.findUnique({
        where: { id: product.sellerId },
      });
    }

    if (!sellerProfile) {
      sellerProfile = await prisma.userProfile.findFirst({
        where: { userId: product.sellerId },
      });
    }

    const result: any = {
      id: Number(product.id),
      title: product.title,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      categoryId: product.categoryId ? Number(product.categoryId) : undefined,
      location: product.location || undefined,
      status: product.status,
      viewCount: Number(product.viewCount),
      sellerId: Number(product.sellerId),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      images: product.images
        ? product.images.map((img: any) => ({
            id: Number(img.id),
            productId: Number(img.productId),
            url: img.url,
          }))
        : [],
      seller: {
        id: Number(seller?.id || 0),
        studentId: seller?.studentId || '',
        email: seller?.phone || '',
        role: seller?.role,
        avatar: sellerProfile?.avatarUrl,
        createdAt: seller?.createdAt || new Date(),
        updatedAt: seller?.updatedAt || new Date(),
        profile: sellerProfile
          ? {
              id: Number(sellerProfile.id),
              userId: Number(sellerProfile.userId),
              name: sellerProfile.name || undefined,
              nickname: sellerProfile.name || undefined,
              studentId: sellerProfile.studentId || seller?.studentId || undefined,
              phone: seller?.phone || undefined, // UserProfile 涓病鏈?phone 瀛楁
              location: sellerProfile.campus || undefined,
              bio: sellerProfile.bio || undefined,
            }
          : undefined,
      },
    };

    if (includeCategory && product.categoryId) {
      let category = preloadedCategories?.get(product.categoryId.toString());
      if (!category) {
        category = await prisma.category.findUnique({
          where: { id: product.categoryId },
        });
      }
      result.category = category
        ? {
            id: Number(category.id),
            name: category.name,
            icon: undefined,
          }
        : undefined;
    }

    return result;
  }

  /**
   * 鑾峰彇鏈€鏂板晢鍝佸垪琛?
   * 浼樺寲锛氭壒閲忛鍔犺浇鍗栧淇℃伅锛岄伩鍏?N+1 鏌ヨ
   */
  async getLatestProducts(limit: number = 20): Promise<ProductListItem[]> {
    const products = await prisma.product.findMany({
      where: { status: 'ON_SALE' as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        images: true,
      },
    });

    // 鎵归噺棰勫姞杞藉崠瀹朵俊鎭?
    const sellerIds = [...new Set(products.map((p: any) => p.sellerId))];
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
    });
    const sellerProfiles = await prisma.userProfile.findMany({
      where: { userId: { in: sellerIds } },
    });

    const sellerMap = new Map<string, any>(sellers.map((s: any) => [s.id.toString(), s]));
    const profileMap = new Map<string, any>(sellerProfiles.map((p: any) => [p.userId.toString(), p]));

    return Promise.all(
      products.map((p: any) => this.convertProduct(p, false, sellerMap, profileMap))
    );
  }

  /**
   * 鑾峰彇鍟嗗搧鍒楄〃锛堟敮鎸佸垎椤点€佺瓫閫夈€佹帓搴忥級
   * 浼樺寲锛氭壒閲忛鍔犺浇鍗栧淇℃伅锛岄伩鍏?N+1 鏌ヨ
   */
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

    const where: any = { status: 'ON_SALE' as any };
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

    const orderBy: any = {};
    if (sort === 'priceAsc') orderBy.price = 'asc';
    else if (sort === 'priceDesc') orderBy.price = 'desc';
    else if (sort === 'viewDesc') orderBy.viewCount = 'desc';
    else orderBy.createdAt = 'desc';

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

    // 鎵归噺棰勫姞杞藉崠瀹朵俊鎭?
    const sellerIds = [...new Set(products.map((p: any) => p.sellerId))];
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
    });
    const sellerProfiles = await prisma.userProfile.findMany({
      where: { userId: { in: sellerIds } },
    });

    const sellerMap = new Map<string, any>(sellers.map((s: any) => [s.id.toString(), s]));
    const profileMap = new Map<string, any>(sellerProfiles.map((p: any) => [p.userId.toString(), p]));

    const content = await Promise.all(
      products.map((p: any) => this.convertProduct(p, false, sellerMap, profileMap))
    );

    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size,
      number: page,
    };
  }

  /**
   * 鑾峰彇鍟嗗搧璇︽儏
   */
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

    return this.convertProduct(product, true);
  }

  /**
   * 鍒涘缓鍟嗗搧
   */
  async createProduct(userId: number, data: CreateProductRequest | any): Promise<ProductWithDetails> {
    // 涓氬姟閫昏緫楠岃瘉
    if (data.price <= 0) {
      throw new BusinessException('价格必须大于0');
    }

    if (data.originalPrice != null && data.originalPrice < data.price) {
      throw new BusinessException('鍘熶环涓嶈兘浣庝簬鐜颁环');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new BusinessException('鍟嗗搧鏍囬涓嶈兘涓虹┖');
    }

    if (!data.description || data.description.trim().length === 0) {
      throw new BusinessException('鍟嗗搧鎻忚堪涓嶈兘涓虹┖');
    }

    const categoryId = (await this.resolveCategoryId(data)) ?? null;

    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        categoryId: categoryId,
        location: data.location,
        sellerId: BigInt(userId),
        status: 'ON_SALE' as any,
        viewCount: BigInt(0),
        images: {
          create: (data.images || []).map((url: string) => ({ url })),
        },
      },
      include: {
        images: true,
      },
    });

    return this.getProductDetail(Number(product.id));
  }

  /**
   * 鏇存柊鍟嗗搧
   */
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

    // 涓氬姟閫昏緫楠岃瘉
    if (data.price !== undefined && data.price <= 0) {
      throw new BusinessException('价格必须大于0');
    }

    const nextPrice = data.price !== undefined ? data.price : Number(product.price);
    if (data.originalPrice != null && data.originalPrice < nextPrice) {
      throw new BusinessException('鍘熶环涓嶈兘浣庝簬鐜颁环');
    }

    const updateData: any = {};
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

    // 濡傛灉鏇存柊浜嗗浘鐗囷紝鍒犻櫎鏃у浘鐗囧苟鍒涘缓鏂板浘鐗?
    if (data.images !== undefined) {
      await prisma.productImage.deleteMany({
        where: { productId: BigInt(productId) },
      });

      if (data.images.length > 0) {
        await prisma.productImage.createMany({
          data: data.images.map((url) => ({
            productId: BigInt(productId) as any,
            url,
          })),
        });
      }
    }

    return this.getProductDetail(productId);
  }

  /**
   * 鍒犻櫎鍟嗗搧锛堣蒋鍒犻櫎锛?
   */
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
      data: { status: 'DELETED' },
    });
  }

  /**
   * 鏇存柊鍟嗗搧鐘舵€?
   */
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
      data: { status: data.status as any },
    });

    return this.getProductDetail(productId);
  }

  /**
   * 澧炲姞娴忚閲?
   */
  async increaseViewCount(productId: number): Promise<void> {
    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { viewCount: { increment: 1 } },
    });
  }

  /**
   * 鑾峰彇鍒嗙被鍒楄〃
   */
  async getCategoryList(): Promise<Array<{ id: number; name: string; icon?: string }>> {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    const existingCategoryNames = new Set(categories.map((category: any) => category.name));
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

    return sortCategoryEntitiesByDefaultOrder([...categories, ...createdCategories]).map((category: any) => ({
      id: Number(category.id),
      name: category.name,
      icon: undefined, // 鏁版嵁搴撲腑娌℃湁 icon 瀛楁
    }));
  }

  /**
   * 鑾峰彇鐢ㄦ埛鐨勫晢鍝佸垪琛?
   * 浼樺寲锛氭壒閲忛鍔犺浇鍗栧淇℃伅锛岄伩鍏?N+1 鏌ヨ
   */
  async getUserProducts(userId: number): Promise<ProductListItem[]> {
    const products = await prisma.product.findMany({
      where: {
        sellerId: BigInt(userId) as any,
        status: { not: 'DELETED' as any },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
      },
    });

    // 鎵归噺棰勫姞杞藉崠瀹朵俊鎭紙铏界劧閮芥槸鍚屼竴涓敤鎴凤紝浣嗕繚鎸佷竴鑷存€э級
    const sellerIds = [...new Set(products.map((p: any) => p.sellerId))];
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
    });
    const sellerProfiles = await prisma.userProfile.findMany({
      where: { userId: { in: sellerIds } },
    });

    const sellerMap = new Map<string, any>(sellers.map((s: any) => [s.id.toString(), s]));
    const profileMap = new Map<string, any>(sellerProfiles.map((p: any) => [p.userId.toString(), p]));

    return Promise.all(
      products.map((p: any) => this.convertProduct(p, false, sellerMap, profileMap))
    );
  }
}
