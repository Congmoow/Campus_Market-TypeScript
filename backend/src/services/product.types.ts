import type {
  Category as PrismaCategory,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  User as PrismaUser,
  UserProfile as PrismaUserProfile,
} from '@prisma/client';

export type ProductRecord = PrismaProduct & {
  images: PrismaProductImage[];
};

export type SellerLookup = {
  sellers: Map<string, PrismaUser>;
  profiles: Map<string, PrismaUserProfile>;
  categories?: Map<string, PrismaCategory>;
};
