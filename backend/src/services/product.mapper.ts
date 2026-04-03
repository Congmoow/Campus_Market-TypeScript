import type { ProductListItem, ProductWithDetails, User } from '@campus-market/shared';
import { mapCategory, mapProductBase, mapProductImage, mapUser } from '../mappers/shared.mapper';
import { prisma } from '../utils/prisma.util';
import { ProductCategoryService } from './product-category.service';
import type { ProductRecord, SellerLookup } from './product.types';

export class ProductMapper {
  constructor(private readonly categoryService = new ProductCategoryService()) {}

  async loadSellerLookup(products: ProductRecord[]): Promise<SellerLookup> {
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

  buildSeller(product: ProductRecord, lookup: SellerLookup): User {
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
          }
        : undefined,
    };
  }

  async convertProduct(
    product: ProductRecord,
    includeCategory = false,
    preloaded?: SellerLookup,
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
        profiles: new Map(sellerProfile ? [[sellerProfile.userId.toString(), sellerProfile]] : []),
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
        (await this.categoryService.getCategoryById(product.categoryId));

      if (category) {
        (result as ProductWithDetails).category = mapCategory(category);
      }
    }

    return result;
  }
}
