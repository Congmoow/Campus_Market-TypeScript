import type { FavoriteWithProduct } from '@campus-market/shared';
import { prisma } from '../utils/prisma.util';
import {
  mapCategory,
  mapProductBase,
  mapProductImage,
  mapUser,
} from '../mappers/shared.mapper';
import { BusinessException, NotFoundException } from '../utils/error.util';

export class FavoriteService {
  async getUserFavorites(userId: number): Promise<FavoriteWithProduct[]> {
    const favorites = await prisma.favorite.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    const favoritesWithProduct: FavoriteWithProduct[] = [];

    for (const favorite of favorites) {
      const product = await prisma.product.findUnique({
        where: { id: favorite.productId },
        include: { images: true },
      });

      if (!product) {
        continue;
      }

      const [seller, sellerProfile, category] = await Promise.all([
        prisma.user.findUnique({
          where: { id: product.sellerId },
        }),
        prisma.userProfile.findFirst({
          where: { userId: product.sellerId },
        }),
        product.categoryId
          ? prisma.category.findUnique({
              where: { id: product.categoryId },
            })
          : Promise.resolve(null),
      ]);

      favoritesWithProduct.push({
        id: Number(favorite.id),
        userId: Number(favorite.userId),
        productId: Number(favorite.productId),
        createdAt: favorite.createdAt,
        product: {
          ...mapProductBase(product),
          images: product.images.map(mapProductImage),
          seller: seller
            ? mapUser(seller, sellerProfile)
            : {
                id: Number(product.sellerId),
                studentId: '',
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
              },
          category: category ? mapCategory(category) : undefined,
        },
      });
    }

    return favoritesWithProduct;
  }

  async addFavorite(userId: number, productId: number): Promise<FavoriteWithProduct> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId: BigInt(userId),
        productId: BigInt(productId),
      },
    });

    if (existingFavorite) {
      throw new BusinessException('已经收藏过该商品');
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: BigInt(userId),
        productId: BigInt(productId),
        createdAt: new Date(),
      },
    });

    const favorites = await this.getUserFavorites(userId);
    const createdFavorite = favorites.find((item) => item.id === Number(favorite.id));

    if (!createdFavorite) {
      throw new BusinessException('收藏创建失败');
    }

    return createdFavorite;
  }

  async removeFavorite(userId: number, productId: number): Promise<void> {
    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: BigInt(userId),
        productId: BigInt(productId),
      },
    });

    if (!favorite) {
      throw new NotFoundException('收藏记录不存在');
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });
  }

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
