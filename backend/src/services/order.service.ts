import type {
  Order as PrismaOrder,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  User as PrismaUser,
  UserProfile as PrismaUserProfile,
} from '@prisma/client';
import {
  CreateOrderRequest,
  MessageType,
  Order,
  OrderStatus,
  OrderWithDetails,
  ProductWithDetails,
} from '@campus-market/shared';
import { prisma } from '../utils/prisma.util';
import {
  mapCategory,
  mapProductBase,
  mapProductImage,
  mapUser,
} from '../mappers/shared.mapper';
import {
  BusinessException,
  ForbiddenException,
  NotFoundException,
} from '../utils/error.util';

type ProductRecord = PrismaProduct & {
  images: PrismaProductImage[];
};

export class OrderService {
  private async generateOrderNo(
    db: {
      order: {
        count: typeof prisma.order.count;
      };
    } = prisma
  ): Promise<string> {
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

  private mapOrderBase(order: PrismaOrder): Order {
    return {
      id: Number(order.id),
      orderNo: order.order_no || `ORD${order.id}`,
      productId: Number(order.productId),
      buyerId: Number(order.buyerId),
      sellerId: Number(order.sellerId),
      priceSnapshot: Number(order.price_snapshot),
      status: order.status,
      meetLocation: order.meet_location || undefined,
      meetTime: order.meet_time || undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private async buildProductDetails(product: ProductRecord): Promise<ProductWithDetails> {
    const [seller, sellerProfile, category] = await Promise.all([
      prisma.user.findUnique({
        where: { id: product.sellerId },
      }),
      prisma.userProfile.findUnique({
        where: { userId: product.sellerId },
      }),
      product.categoryId
        ? prisma.category.findUnique({
            where: { id: product.categoryId },
          })
        : Promise.resolve(null),
    ]);

    return {
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
    };
  }

  private async convertOrder(
    order: PrismaOrder,
    includeDetails = false
  ): Promise<Order | OrderWithDetails> {
    const result = this.mapOrderBase(order);

    if (!includeDetails) {
      return result;
    }

    const [product, buyer, buyerProfile, seller, sellerProfile] = await Promise.all([
      prisma.product.findUnique({
        where: { id: order.productId },
        include: { images: true },
      }),
      prisma.user.findUnique({
        where: { id: order.buyerId },
      }),
      prisma.userProfile.findUnique({
        where: { userId: order.buyerId },
      }),
      prisma.user.findUnique({
        where: { id: order.sellerId },
      }),
      prisma.userProfile.findUnique({
        where: { userId: order.sellerId },
      }),
    ]);

    const detailedOrder: OrderWithDetails = {
      ...result,
      product: product ? await this.buildProductDetails(product) : undefined,
      buyer: buyer
        ? mapUser(buyer, buyerProfile)
        : {
            id: Number(order.buyerId),
            studentId: '',
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
      seller: seller
        ? mapUser(seller, sellerProfile)
        : {
            id: Number(order.sellerId),
            studentId: '',
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
    };

    if (product) {
      detailedOrder.productTitle = product.title;
      detailedOrder.productImage = product.images[0]?.url;
      detailedOrder.productPrice = Number(product.price);
    }

    detailedOrder.buyerName = buyerProfile?.name || buyer?.studentId || '';
    detailedOrder.buyerAvatar = buyerProfile?.avatarUrl || undefined;
    detailedOrder.sellerName = sellerProfile?.name || seller?.studentId || '';
    detailedOrder.sellerAvatar = sellerProfile?.avatarUrl || undefined;

    return detailedOrder;
  }

  async createOrder(
    buyerId: number,
    data: CreateOrderRequest
  ): Promise<OrderWithDetails> {
    if (!data.meetLocation || data.meetLocation.trim().length === 0) {
      throw new BusinessException('交易地点不能为空');
    }

    if (!data.contactPhone || data.contactPhone.trim().length === 0) {
      throw new BusinessException('联系电话不能为空');
    }

    if (!data.contactName || data.contactName.trim().length === 0) {
      throw new BusinessException('联系人不能为空');
    }

    const productId = BigInt(data.productId);
    let order!: PrismaOrder;

    await prisma.$transaction(async (tx) => {
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
          status: OrderStatus.PENDING,
          meet_location: data.meetLocation,
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
      '我已下单，请尽快确认交易安排'
    );

    return this.convertOrder(order, true) as Promise<OrderWithDetails>;
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

    return this.convertOrder(order, true) as Promise<OrderWithDetails>;
  }

  async getMyOrders(buyerId: number): Promise<OrderWithDetails[]> {
    if (!buyerId || Number.isNaN(buyerId)) {
      throw new BusinessException('无效的用户 ID');
    }

    const orders = await prisma.order.findMany({
      where: { buyerId: BigInt(buyerId) },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      orders.map((order) => this.convertOrder(order, true) as Promise<OrderWithDetails>)
    );
  }

  async getMySalesOrders(sellerId: number): Promise<OrderWithDetails[]> {
    if (!sellerId || Number.isNaN(sellerId)) {
      throw new BusinessException('无效的用户 ID');
    }

    const orders = await prisma.order.findMany({
      where: { sellerId: BigInt(sellerId) },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      orders.map((order) => this.convertOrder(order, true) as Promise<OrderWithDetails>)
    );
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

    if (order.status !== OrderStatus.PENDING) {
      throw new BusinessException('订单状态不允许发货');
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: BigInt(orderId),
          sellerId: BigInt(userId),
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.SHIPPED,
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
      '商品已发出，请注意查收'
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

    if (order.status !== OrderStatus.SHIPPED) {
      throw new BusinessException('订单状态不允许完成');
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.order.updateMany({
        where: {
          id: BigInt(orderId),
          buyerId: BigInt(userId),
          status: OrderStatus.SHIPPED,
        },
        data: {
          status: OrderStatus.COMPLETED,
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
      '商品已确认收货，交易完成'
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

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BusinessException('订单状态不允许取消');
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.order.updateMany({
        where: {
          id: BigInt(orderId),
          status: { in: [OrderStatus.PENDING, OrderStatus.SHIPPED] },
          OR: [{ buyerId: BigInt(userId) }, { sellerId: BigInt(userId) }],
        },
        data: {
          status: OrderStatus.CANCELLED,
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
