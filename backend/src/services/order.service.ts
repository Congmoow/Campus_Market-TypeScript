import { prisma } from '../utils/prisma.util';
import {
  CreateOrderRequest,
  OrderWithDetails,
  Order,
  MessageType,
} from '../types/shared';
import {
  BusinessException,
  NotFoundException,
  ForbiddenException,
} from '../utils/error.util';

export class OrderService {
  private async generateOrderNo(db: any = prisma): Promise<string> {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayOrderCount = await db.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const sequence = (todayOrderCount + 1).toString().padStart(6, '0');
    return `ORD${dateStr}${sequence}`;
  }

  private async sendOrderNotification(
    productId: bigint,
    senderId: number,
    receiverId: number,
    message: string
  ): Promise<void> {
    try {
      const buyerId = senderId < receiverId ? senderId : receiverId;
      const sellerId = senderId > receiverId ? senderId : receiverId;

      let session = await prisma.chatSession.findFirst({
        where: {
          productId,
          buyerId: BigInt(buyerId),
          sellerId: BigInt(sellerId),
        },
      });

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            productId,
            buyerId: BigInt(buyerId),
            sellerId: BigInt(sellerId),
          },
        });
      }

      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          senderId: BigInt(senderId),
          content: message,
          type: MessageType.TEXT,
          isRecalled: false,
          isRead: false,
        },
      });

      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      console.error('发送订单通知失败:', error);
    }
  }

  private async convertOrder(order: any, includeDetails = false): Promise<any> {
    const result: any = {
      id: Number(order.id),
      orderNo: (order as any).order_no || `ORD${order.id}`,
      productId: Number(order.productId),
      buyerId: Number(order.buyerId),
      sellerId: Number(order.sellerId),
      totalAmount: Number(order.price_snapshot),
      status: order.status,
      deliveryAddress: order.meet_location || '',
      deliveryPhone: '',
      deliveryName: '',
      remark: order.meet_time ? order.meet_time.toISOString() : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    if (!includeDetails) {
      return result;
    }

    const product = await prisma.product.findUnique({
      where: { id: order.productId },
      include: { images: true },
    });

    const buyer = await prisma.user.findUnique({
      where: { id: order.buyerId },
    });
    const buyerProfile = await prisma.userProfile.findUnique({
      where: { userId: order.buyerId },
    });

    const seller = await prisma.user.findUnique({
      where: { id: order.sellerId },
    });
    const sellerProfile = await prisma.userProfile.findUnique({
      where: { userId: order.sellerId },
    });

    let category = null;
    if (product?.categoryId) {
      category = await prisma.category.findUnique({
        where: { id: product.categoryId },
      });
    }

    result.product = product
      ? {
          id: Number(product.id),
          title: product.title,
          description: product.description,
          price: Number(product.price),
          originalPrice: product.originalPrice
            ? Number(product.originalPrice)
            : undefined,
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
            avatar: sellerProfile?.avatarUrl,
            createdAt: seller?.createdAt || new Date(),
            updatedAt: seller?.updatedAt || new Date(),
            profile: sellerProfile
              ? {
                  id: Number(sellerProfile.id),
                  userId: Number(sellerProfile.userId),
                  name: sellerProfile.name || undefined,
                  nickname: sellerProfile.name || undefined,
                  studentId:
                    sellerProfile.studentId || seller?.studentId || undefined,
                  phone: seller?.phone || undefined,
                  location: sellerProfile.campus || undefined,
                  bio: sellerProfile.bio || undefined,
                }
              : undefined,
          },
          category: category
            ? {
                id: Number(category.id),
                name: category.name,
                icon: undefined,
              }
            : undefined,
        }
      : undefined;

    if (product) {
      result.productTitle = product.title;
      result.productImage =
        product.images.length > 0 ? product.images[0].url : undefined;
      result.productPrice = Number(product.price);
    }

    result.buyerName = buyerProfile?.name || buyer?.studentId || '';
    result.buyerAvatar = buyerProfile?.avatarUrl;
    result.sellerName = sellerProfile?.name || seller?.studentId || '';
    result.sellerAvatar = sellerProfile?.avatarUrl;

    result.buyer = {
      id: Number(buyer?.id || 0),
      studentId: buyer?.studentId || '',
      email: buyer?.phone || '',
      role: buyer?.role,
      avatar: buyerProfile?.avatarUrl,
      createdAt: buyer?.createdAt || new Date(),
      updatedAt: buyer?.updatedAt || new Date(),
      profile: buyerProfile
        ? {
            id: Number(buyerProfile.id),
            userId: Number(buyerProfile.userId),
            name: buyerProfile.name || undefined,
            nickname: buyerProfile.name || undefined,
            studentId: buyerProfile.studentId || buyer?.studentId || undefined,
            phone: buyer?.phone || undefined,
            location: buyerProfile.campus || undefined,
            bio: buyerProfile.bio || undefined,
          }
        : undefined,
    };

    result.seller = {
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
            phone: seller?.phone || undefined,
            location: sellerProfile.campus || undefined,
            bio: sellerProfile.bio || undefined,
          }
        : undefined,
    };

    return result;
  }

  async createOrder(
    buyerId: number,
    data: CreateOrderRequest
  ): Promise<OrderWithDetails> {
    if (!data.deliveryAddress || data.deliveryAddress.trim().length === 0) {
      throw new BusinessException('收货地址不能为空');
    }

    if (!data.deliveryPhone || data.deliveryPhone.trim().length === 0) {
      throw new BusinessException('收货电话不能为空');
    }

    if (!data.deliveryName || data.deliveryName.trim().length === 0) {
      throw new BusinessException('收货人姓名不能为空');
    }

    const productId = BigInt(data.productId);
    let order: any;

    await prisma.$transaction(async (tx: any) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('商品不存在');
      }

      if (product.status !== 'ON_SALE') {
        throw new BusinessException('商品不可购买');
      }

      if (Number(product.sellerId) === buyerId) {
        throw new BusinessException('不能购买自己的商品');
      }

      const reserved = await tx.product.updateMany({
        where: {
          id: productId,
          status: 'ON_SALE',
        },
        data: {
          status: 'RESERVED',
        },
      });

      if (reserved.count !== 1) {
        throw new BusinessException('商品已被其他用户下单');
      }

      const now = new Date();
      const orderNo = await this.generateOrderNo(tx);
      order = await tx.order.create({
        data: {
          order_no: orderNo,
          productId,
          buyerId: BigInt(buyerId),
          sellerId: product.sellerId,
          price_snapshot: product.price,
          status: 'PENDING',
          meet_location: data.deliveryAddress,
          meet_time: now,
          createdAt: now,
          updatedAt: now,
        },
      });
    });

    await this.sendOrderNotification(
      order.productId,
      buyerId,
      Number(order.sellerId),
      '我已下单，请尽快发货'
    );

    return this.convertOrder(order, true);
  }

  async getOrderDetail(userId: number, orderId: number): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (Number(order.buyerId) !== userId && Number(order.sellerId) !== userId) {
      throw new ForbiddenException('无权查看此订单');
    }

    return this.convertOrder(order, true);
  }

  async getMyOrders(buyerId: number): Promise<Order[]> {
    if (!buyerId || isNaN(buyerId)) {
      throw new BusinessException('无效的用户ID');
    }

    const orders = await prisma.order.findMany({
      where: { buyerId: BigInt(buyerId) },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(orders.map((order: any) => this.convertOrder(order, true)));
  }

  async getMySalesOrders(sellerId: number): Promise<Order[]> {
    if (!sellerId || isNaN(sellerId)) {
      throw new BusinessException('无效的用户ID');
    }

    const orders = await prisma.order.findMany({
      where: { sellerId: BigInt(sellerId) },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(orders.map((order: any) => this.convertOrder(order, true)));
  }

  async shipOrder(userId: number, orderId: number): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (Number(order.sellerId) !== userId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (order.status !== 'PENDING') {
      throw new BusinessException('订单状态不允许发货');
    }

    await prisma.$transaction(async (tx: any) => {
      const updated = await tx.order.updateMany({
        where: {
          id: BigInt(orderId),
          sellerId: BigInt(userId),
          status: 'PENDING',
        },
        data: {
          status: 'SHIPPED',
          updatedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw new BusinessException('订单状态不允许发货');
      }
    });

    await this.sendOrderNotification(
      order.productId,
      userId,
      Number(order.buyerId),
      '商品已发货，请注意查收'
    );

    return this.getOrderDetail(userId, orderId);
  }

  async completeOrder(userId: number, orderId: number): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (Number(order.buyerId) !== userId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (order.status !== 'SHIPPED') {
      throw new BusinessException('订单状态不允许完成');
    }

    await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      const updated = await tx.order.updateMany({
        where: {
          id: BigInt(orderId),
          buyerId: BigInt(userId),
          status: 'SHIPPED',
        },
        data: {
          status: 'COMPLETED',
          updatedAt: now,
        },
      });

      if (updated.count !== 1) {
        throw new BusinessException('订单状态不允许完成');
      }

      await tx.product.update({
        where: { id: order.productId },
        data: {
          status: 'SOLD',
          updatedAt: now,
        },
      });
    });

    await this.sendOrderNotification(
      order.productId,
      userId,
      Number(order.sellerId),
      '商品已收到，交易完成'
    );

    return this.getOrderDetail(userId, orderId);
  }

  async cancelOrder(userId: number, orderId: number): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (Number(order.buyerId) !== userId && Number(order.sellerId) !== userId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BusinessException('订单状态不允许取消');
    }

    await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      const updated = await tx.order.updateMany({
        where: {
          id: BigInt(orderId),
          status: { in: ['PENDING', 'SHIPPED'] },
          OR: [{ buyerId: BigInt(userId) }, { sellerId: BigInt(userId) }],
        },
        data: {
          status: 'CANCELLED',
          updatedAt: now,
        },
      });

      if (updated.count !== 1) {
        throw new BusinessException('订单状态不允许取消');
      }

      await tx.product.update({
        where: { id: order.productId },
        data: {
          status: 'ON_SALE',
          updatedAt: now,
        },
      });
    });

    const receiverId =
      Number(order.buyerId) === userId
        ? Number(order.sellerId)
        : Number(order.buyerId);

    await this.sendOrderNotification(
      order.productId,
      userId,
      receiverId,
      '订单已取消'
    );

    return this.getOrderDetail(userId, orderId);
  }
}
