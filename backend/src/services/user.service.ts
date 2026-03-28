import { prisma } from '../utils/prisma.util';
import {
  User,
  UserProfile,
  UpdateProfileRequest,
  ProductListItem,
} from '../types/shared';
import { NotFoundException } from '../utils/error.util';

export class UserService {
  private convertUser(user: any, profile?: any): User & { profile?: UserProfile } {
    return {
      id: Number(user.id),
      studentId: user.studentId,
      email: user.phone || '',
      role: user.role,
      avatar: profile?.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: profile
        ? {
            id: Number(profile.id),
            userId: Number(profile.userId),
            name: profile.name || undefined,
            nickname: profile.name || undefined,
            studentId: profile.studentId || user.studentId,
            phone: user.phone || undefined,
            location: profile.campus || undefined,
            avatarUrl: profile.avatarUrl || undefined,
            major: profile.major || undefined,
            grade: profile.grade || undefined,
            campus: profile.campus || undefined,
            bio: profile.bio || undefined,
          }
        : undefined,
    };
  }

  private async getProfileCounts(userId: number): Promise<{
    sellingCount: number;
    soldCount: number;
  }> {
    const [sellingCount, soldCount] = await Promise.all([
      prisma.product.count({
        where: {
          sellerId: BigInt(userId),
          status: 'ON_SALE',
        },
      }),
      prisma.product.count({
        where: {
          sellerId: BigInt(userId),
          status: 'SOLD',
        },
      }),
    ]);

    return { sellingCount, soldCount };
  }

  private async buildProfileResponse(
    userId: number,
    user: any,
    profile?: any
  ): Promise<any> {
    const { sellingCount, soldCount } = await this.getProfileCounts(userId);
    const result = {
      ...this.convertUser(user, profile),
      sellingCount,
      soldCount,
    };

    if (!profile) {
      return {
        ...result,
        joinAt: user.createdAt,
      };
    }

    return {
      ...result,
      name: profile.name,
      nickname: profile.name,
      studentId: profile.studentId || user.studentId,
      avatarUrl: profile.avatarUrl,
      major: profile.major,
      grade: profile.grade,
      campus: profile.campus,
      bio: profile.bio,
      credit: profile.credit,
      joinAt: user.createdAt,
    };
  }

  async getUserProfile(userId: number): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const profile = await prisma.userProfile.findFirst({
      where: { userId: BigInt(userId) },
    });

    return this.buildProfileResponse(userId, user, profile);
  }

  async updateUserProfile(
    userId: number,
    data: UpdateProfileRequest
  ): Promise<User & { profile?: UserProfile }> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    let profile = await prisma.userProfile.findFirst({
      where: { userId: BigInt(userId) },
    });

    const normalizedName = data.name ?? data.nickname;
    const normalizedCampus = data.campus ?? data.location;
    const normalizedAvatarUrl = data.avatarUrl ?? data.avatar;
    const now = new Date();

    let updatedUser = user;
    if (data.phone !== undefined) {
      updatedUser = await prisma.user.update({
        where: { id: BigInt(userId) },
        data: {
          phone: data.phone,
          updatedAt: now,
        },
      });
    }

    const updateData: any = {};
    if (normalizedName !== undefined) updateData.name = normalizedName;
    if (data.studentId !== undefined) updateData.studentId = data.studentId;
    if (normalizedCampus !== undefined) updateData.campus = normalizedCampus;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (normalizedAvatarUrl !== undefined) updateData.avatarUrl = normalizedAvatarUrl;
    if (data.major !== undefined) updateData.major = data.major;
    if (data.grade !== undefined) updateData.grade = data.grade;
    updateData.updatedAt = now;

    if (profile) {
      profile = await prisma.userProfile.update({
        where: { id: profile.id },
        data: updateData,
      });
    } else {
      profile = await prisma.userProfile.create({
        data: {
          userId: BigInt(userId),
          name: normalizedName || user.studentId,
          studentId: data.studentId || user.studentId,
          avatarUrl: normalizedAvatarUrl,
          major: data.major,
          grade: data.grade,
          campus: normalizedCampus,
          bio: data.bio,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    return this.buildProfileResponse(userId, updatedUser, profile);
  }

  async getUserProducts(userId: number, status?: string): Promise<ProductListItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const whereCondition: any = {
      sellerId: BigInt(userId),
      status: { not: 'DELETED' },
    };

    if (status && status !== 'ALL') {
      whereCondition.status = status;
    }

    const products = await prisma.product.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
      },
    });

    const profile = await prisma.userProfile.findFirst({
      where: { userId: BigInt(userId) },
    });

    return Promise.all(
      products.map(async (product: any) => ({
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
          id: Number(user.id),
          studentId: user.studentId,
          email: user.phone || '',
          role: user.role,
          avatar: profile?.avatarUrl || undefined,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: profile
            ? {
                id: Number(profile.id),
                userId: Number(profile.userId),
                name: profile.name || undefined,
                nickname: profile.name || undefined,
                studentId: profile.studentId || user.studentId,
                phone: user.phone || undefined,
                location: profile.campus || undefined,
                bio: profile.bio || undefined,
              }
            : undefined,
        },
      }))
    );
  }
}
