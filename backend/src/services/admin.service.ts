import { prisma } from '../utils/prisma.util';
import { BusinessException, NotFoundException } from '../utils/error.util';

/**
 * 绠＄悊鍛樻湇鍔＄被
 * 澶勭悊绠＄悊鍛樼浉鍏崇殑涓氬姟閫昏緫
 */
export class AdminService {
  /**
   * 鑾峰彇绯荤粺缁熻鏁版嵁
   */
  async getStatistics() {
    const [totalUsers, totalProducts, totalOrders, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { enabled: true } }),
    ]);

    // 鑾峰彇浠婃棩鏁版嵁
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayUsers, todayProducts, todayOrders] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.product.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
    ]);

    // 鑾峰彇璁㈠崟鐘舵€佸垎甯?
    const orderStatusDistribution = await this.getOrderStatusDistribution();

    // 鑾峰彇鏈€杩?澶╃殑閿€鍞瓒嬪娍
    const salesTrend = await this.getSalesTrend(7);

    // 鑾峰彇鏈€杩?涓湀鐨勭敤鎴峰闀胯秼鍔?
    const userGrowthTrend = await this.getUserGrowthTrend(6);

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

  /**
   * 鑾峰彇璁㈠崟鐘舵€佸垎甯?
   */
  async getOrderStatusDistribution() {
    const statuses = ['PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    const distribution = await Promise.all(
      statuses.map(async (status) => {
        const count = await prisma.order.count({ where: { status } });
        return { status, count };
      })
    );
    
    return distribution;
  }

  /**
   * 鑾峰彇閿€鍞瓒嬪娍锛堟渶杩慛澶╋級
   */
  async getSalesTrend(days: number = 7) {
    const trend = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // 鑾峰彇褰撳ぉ宸插畬鎴愯鍗曠殑鎬婚噾棰?
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          status: 'COMPLETED',
        },
        select: {
          price_snapshot: true,
        },
      });
      
      const amount = orders.reduce((sum: number, order: any) => sum + Number(order.price_snapshot), 0);
      
      // 格式化日期
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const label = i === 0 ? '今天' : weekdays[date.getDay()];
      
      trend.push({
        date: label,
        amount: Math.round(amount),
      });
    }
    
    return trend;
  }

  /**
   * 鑾峰彇鐢ㄦ埛澧為暱瓒嬪娍锛堟渶杩慛涓湀锛?
   */
  async getUserGrowthTrend(months: number = 6) {
    const trend = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      // 鑾峰彇璇ユ湀涔嬪墠鐨勬€荤敤鎴锋暟
      const totalUsers = await prisma.user.count({
        where: {
          createdAt: {
            lt: nextDate,
          },
        },
      });
      
      // 鑾峰彇璇ユ湀鏂板鐢ㄦ埛鏁?
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });
      
      trend.push({
        month: `${date.getMonth() + 1}月`,
        users: totalUsers,
        newUsers,
      });
    }
    
    return trend;
  }

  /**
   * 鑾峰彇鎵€鏈夌敤鎴峰垪琛?
   */
  async getAllUsers(page: number = 1, pageSize: number = 20, keyword?: string) {
    const skip = (page - 1) * pageSize;
    
    const where = keyword
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
      users: users.map((user: any) => ({
        id: Number(user.id),
        studentId: user.studentId,
        phone: user.phone,
        role: user.role,
        enabled: user.enabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 鍒囨崲鐢ㄦ埛鍚敤鐘舵€?
   */
  async toggleUserStatus(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 涓嶅厑璁哥鐢ㄧ鐞嗗憳璐︽埛
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

  /**
   * 鑾峰彇鎵€鏈夊晢鍝佸垪琛?
   */
  async getAllProducts(page: number = 1, pageSize: number = 20, keyword?: string) {
    const skip = (page - 1) * pageSize;
    
    const where = keyword
      ? {
          status: { not: 'DELETED' }, // 鎺掗櫎宸插垹闄ょ殑鍟嗗搧
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {
          status: { not: 'DELETED' }, // 鎺掗櫎宸插垹闄ょ殑鍟嗗搧
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
      products: products.map((product: any) => ({
        id: Number(product.id),
        sellerId: Number(product.sellerId),
        title: product.title,
        description: product.description,
        price: Number(product.price),
        status: product.status,
        viewCount: Number(product.viewCount),
        imageUrl: product.images[0]?.url,
        createdAt: product.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 鍒犻櫎鍟嗗搧
   */
  async deleteProduct(productId: number) {
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

  /**
   * 鑾峰彇鎵€鏈夎鍗曞垪琛?
   */
  async getAllOrders(page: number = 1, pageSize: number = 20, keyword?: string) {
    const skip = (page - 1) * pageSize;
    
    const where = keyword ? {} : {};

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
      orders: orders.map((order: any) => ({
        id: Number(order.id),
        orderNo: (order as any).order_no || ('ORD' + order.id),
        buyerId: Number(order.buyerId),
        sellerId: Number(order.sellerId),
        productId: Number(order.productId),
        status: order.status,
        priceSnapshot: Number(order.price_snapshot),
        meetLocation: order.meet_location,
        meetTime: order.meet_time,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 鑾峰彇鎵€鏈夊垎绫?
   */
  async getAllCategories() {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    // 鑾峰彇姣忎釜鍒嗙被鐨勫晢鍝佹暟閲?
    const categoriesWithCount = await Promise.all(
      categories.map(async (category: any) => {
        const productCount = await prisma.product.count({
          where: { categoryId: category.id },
        });
        return {
          id: Number(category.id),
          name: category.name,
          productCount,
        };
      })
    );

    return categoriesWithCount;
  }

  /**
   * 鍒涘缓鍒嗙被
   */
  async createCategory(name: string) {
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

  /**
   * 鍒犻櫎鍒嗙被
   */
  async deleteCategory(categoryId: number) {
    const category = await prisma.category.findUnique({
      where: { id: BigInt(categoryId) },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    // 妫€鏌ユ槸鍚︽湁鍟嗗搧浣跨敤璇ュ垎绫?
    const productCount = await prisma.product.count({
      where: { categoryId: BigInt(categoryId) },
    });

    if (productCount > 0) {
      throw new BusinessException('该分类下还有 ' + productCount + ' 个商品，无法删除');
    }

    await prisma.category.delete({
      where: { id: BigInt(categoryId) },
    });

    return { success: true };
  }
}
