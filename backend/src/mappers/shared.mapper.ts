import type {
  Category as PrismaCategory,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  User as PrismaUser,
  UserProfile as PrismaUserProfile,
} from '@prisma/client';
import type {
  Category,
  Product,
  ProductImage,
  User,
  UserProfile,
} from '@campus-market/shared';

export function mapUserProfile(
  profile: PrismaUserProfile,
  user?: PrismaUser | null
): UserProfile {
  return {
    id: Number(profile.id),
    userId: Number(profile.userId),
    name: profile.name || undefined,
    studentId: profile.studentId || user?.studentId || undefined,
    phone: user?.phone ?? undefined,
    campus: profile.campus || undefined,
    avatarUrl: profile.avatarUrl || undefined,
    major: profile.major || undefined,
    grade: profile.grade || undefined,
    bio: profile.bio || undefined,
  };
}

export function mapUser(user: PrismaUser, profile?: PrismaUserProfile | null): User {
  return {
    id: Number(user.id),
    studentId: user.studentId,
    phone: user.phone ?? undefined,
    role: user.role,
    avatar: profile?.avatarUrl || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: profile ? mapUserProfile(profile, user) : undefined,
  };
}

export function mapCategory(category: PrismaCategory): Category {
  return {
    id: Number(category.id),
    name: category.name,
    icon: undefined,
  };
}

export function mapProductImage(image: PrismaProductImage): ProductImage {
  return {
    id: Number(image.id),
    productId: Number(image.productId),
    url: image.url,
  };
}

export function mapProductBase(product: PrismaProduct): Product {
  return {
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
  };
}
