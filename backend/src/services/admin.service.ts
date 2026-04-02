import type { Prisma } from '@prisma/client';
import type {
  AdminCategoryListItem,
  AdminOrderListResponse,
  AdminOrderStatusDistributionItem,
  AdminProductListResponse,
  AdminSalesTrendPoint,
  AdminStatistics,
  AdminUserGrowthTrendPoint,
  AdminUserListResponse,
  AdminUserStatusUpdate,
} from '@campus-market/shared';
import { OrderStatus } from '@campus-market/shared';
import { mapAdminCategory, mapAdminOrder, mapAdminProduct, mapAdminUser } from '../mappers/admin.mapper';
import { BusinessException, NotFoundException } from '../utils/error.util';
import { prisma } from '../utils/prisma.util';

type SalesAmountRecord = {
  price_snapshot: Prisma.Decimal;
};

export class AdminService {
  async getStatistics(): Promise<AdminStatistics> {
    const [totalUsers, totalProducts, totalOrders, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { enabled: true } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayUsers, todayProducts, todayOrders, orderStatusDistribution, salesTrend, userGrowthTrend] =
      await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: today } } }),
        prisma.product.count({ where: { createdAt: { gte: today } } }),
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        this.getOrderStatusDistribution(),
        this.getSalesTrend(7),
        this.getUserGrowthTrend(6),
      ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      activeUsers,
      todayUsers,
      todayProducts,
      todayOrders,
      orderStatusDistribution,
      salesTrend,
      userGrowthTrend,
    };
  }

  async getOrderStatusDistribution(): Promise<AdminOrderStatusDistributionItem[]> {
    const statuses = [
      OrderStatus.PENDING,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ] as const;

    return Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await prisma.order.count({ where: { status } }),
      }))
    );
  }

  async getSalesTrend(days = 7): Promise<AdminSalesTrendPoint[]> {
    const trend: AdminSalesTrendPoint[] = [];
    const now = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const orders: SalesAmountRecord[] = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          status: OrderStatus.COMPLETED,
        },
        select: {
          price_snapshot: true,
        },
      });

      const amount = orders.reduce(
        (sum, order) => sum + Number(order.price_snapshot),
        0
      );

      trend.push({
        date: i === 0 ? '今天' : weekdays[date.getDay()],
        amount: Math.round(amount),
      });
    }

    return trend;
  }

  async getUserGrowthTrend(months = 6): Promise<AdminUserGrowthTrendPoint[]> {
    const trend: AdminUserGrowthTrendPoint[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [users, newUsers] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              lt: nextDate,
            },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      trend.push({
        month: `${date.getMonth() + 1}月`,
        users,
        newUsers,
      });
    }

    return trend;
  }

  async getAllUsers(
    page = 1,
    pageSize = 20,
    keyword?: string
  ): Promise<AdminUserListResponse> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = keyword
      ? {
          OR: [
            { studentId: { contains: keyword } },
            { phone: { contains: keyword } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(mapAdminUser),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async toggleUserStatus(userId: number): Promise<AdminUserStatusUpdate> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.role === 'ADMIN') {
      throw new BusinessException('不能禁用管理员账户');
    }

    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { enabled: !user.enabled },
    });

    return {
      id: Number(updatedUser.id),
      studentId: updatedUser.studentId,
      enabled: updatedUser.enabled,
    };
  }

  async getAllProducts(
    page = 1,
    pageSize = 20,
    keyword?: string
  ): Promise<AdminProductListResponse> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProductWhereInput = keyword
      ? {
          status: { not: 'DELETED' },
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {
          status: { not: 'DELETED' },
        };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            orderBy: { sort_order: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map(mapAdminProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteProduct(productId: number): Promise<{ success: true }> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    await prisma.product.delete({
      where: { id: BigInt(productId) },
    });

    return { success: true };
  }

  async getAllOrders(
    page = 1,
    pageSize = 20,
    keyword?: string
  ): Promise<AdminOrderListResponse> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.OrderWhereInput = keyword ? {} : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(mapAdminOrder),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAllCategories(): Promise<AdminCategoryListItem[]> {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    return Promise.all(
      categories.map(async (category) => {
        const productCount = await prisma.product.count({
          where: { categoryId: category.id },
        });

        return mapAdminCategory(category, productCount);
      })
    );
  }

  async createCategory(name: string): Promise<Pick<AdminCategoryListItem, 'id' | 'name'>> {
    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BusinessException('分类名称已存在');
    }

    const category = await prisma.category.create({
      data: { name },
    });

    return {
      id: Number(category.id),
      name: category.name,
    };
  }

  async deleteCategory(categoryId: number): Promise<{ success: true }> {
    const category = await prisma.category.findUnique({
      where: { id: BigInt(categoryId) },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const productCount = await prisma.product.count({
      where: { categoryId: BigInt(categoryId) },
    });

    if (productCount > 0) {
      throw new BusinessException(`该分类下还有 ${productCount} 个商品，无法删除`);
    }

    await prisma.category.delete({
      where: { id: BigInt(categoryId) },
    });

    return { success: true };
  }
}
