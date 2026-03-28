import { prisma } from '../utils/prisma.util';
import { FavoriteWithProduct } from '../types/shared';
import { BusinessException, NotFoundException } from '../utils/error.util';

export class FavoriteService {
  /**
   * 鑾峰彇鐢ㄦ埛鐨勬敹钘忓垪琛?
   */
  async getUserFavorites(userId: number): Promise<FavoriteWithProduct[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    // 鑾峰彇姣忎釜鏀惰棌鐨勫晢鍝佽鎯?
    const favoritesWithProduct: FavoriteWithProduct[] = [];
    
    for (const favorite of favorites) {
      const product = await prisma.product.findUnique({
        where: { id: favorite.productId },
        include: { images: true },
      });

      if (!product) {
        continue; // 鍟嗗搧宸茶鍒犻櫎锛岃烦杩?
      }

      // 鑾峰彇鍗栧淇℃伅
      const seller = await prisma.user.findUnique({
        where: { id: product.sellerId },
      });
      const sellerProfile = await prisma.userProfile.findFirst({
        where: { userId: product.sellerId },
      });

      // 鑾峰彇鍒嗙被淇℃伅
      let category = undefined;
      if (product.categoryId) {
        const cat = await prisma.category.findUnique({
          where: { id: product.categoryId },
        });
        if (cat) {
          category = {
            id: Number(cat.id),
            name: cat.name,
            icon: undefined,
          };
        }
      }

      favoritesWithProduct.push({
        id: Number(favorite.id),
        userId: Number(favorite.userId),
        productId: Number(favorite.productId),
        createdAt: favorite.createdAt,
        product: {
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
          images: product.images.map((img: any) => ({
            id: Number(img.id),
            productId: Number(img.productId),
            url: img.url,
          })),
          seller: {
            id: Number(seller?.id || 0),
            studentId: seller?.studentId || '',
            email: seller?.phone || '',
            role: seller?.role,
            avatar: sellerProfile?.avatarUrl || undefined,
            createdAt: seller?.createdAt || new Date(),
            updatedAt: seller?.updatedAt || new Date(),
            profile: sellerProfile
              ? {
                  id: Number(sellerProfile.id),
                  userId: Number(sellerProfile.userId),
                  name: sellerProfile.name || undefined,
                  nickname: sellerProfile.name || undefined,
                  studentId: sellerProfile.studentId || undefined,
                  phone: seller?.phone || undefined,
                  location: sellerProfile.campus || undefined,
                  bio: sellerProfile.bio || undefined,
                }
              : undefined,
          },
          category: category!,
        },
      });
    }

    return favoritesWithProduct;
  }

  /**
   * 娣诲姞鏀惰棌
   */
  async addFavorite(userId: number, productId: number): Promise<FavoriteWithProduct> {
    // 妫€鏌ュ晢鍝佹槸鍚﹀瓨鍦?
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 妫€鏌ユ槸鍚﹀凡缁忔敹钘?
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId: BigInt(userId),
        productId: BigInt(productId),
      },
    });

    if (existingFavorite) {
      throw new BusinessException('宸茬粡鏀惰棌杩囪鍟嗗搧');
    }

    // 鍒涘缓鏀惰棌
    const favorite = await prisma.favorite.create({
      data: {
        userId: BigInt(userId),
        productId: BigInt(productId),
        createdAt: new Date(),
      },
    });

    // 鑾峰彇瀹屾暣鐨勬敹钘忎俊鎭?
    const favorites = await this.getUserFavorites(userId);
    const createdFavorite = favorites.find((f) => f.id === Number(favorite.id));

    if (!createdFavorite) {
      throw new BusinessException('鏀惰棌鍒涘缓澶辫触');
    }

    return createdFavorite;
  }

  /**
   * 鍙栨秷鏀惰棌
   */
  async removeFavorite(userId: number, productId: number): Promise<void> {
    // 鏌ユ壘鏀惰棌璁板綍
    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: BigInt(userId),
        productId: BigInt(productId),
      },
    });

    if (!favorite) {
      throw new NotFoundException('收藏记录不存在');
    }

    // 鍒犻櫎鏀惰棌
    await prisma.favorite.delete({
      where: { id: favorite.id },
    });
  }

  /**
   * 妫€鏌ユ槸鍚﹀凡鏀惰棌
   */
  async isFavorited(userId: number, productId: number): Promise<boolean> {
    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: BigInt(userId),
        productId: BigInt(productId),
      },
    });

    return !!favorite;
  }
}
