import { OrderService } from '../order.service';
import { prisma } from '../../utils/prisma.util';
import { BusinessException } from '../../utils/error.util';

jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    $transaction: jest.fn(),
    order: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    chatSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  },
}));

describe('OrderService transactionality', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
    jest.clearAllMocks();
    jest
      .spyOn(orderService as any, 'sendOrderNotification')
      .mockResolvedValue(undefined);
  });

  describe('createOrder', () => {
    it('creates the order inside a transaction after a guarded product reservation', async () => {
      const product = {
        id: BigInt(10),
        sellerId: BigInt(2),
        price: 88.5,
        status: 'ON_SALE',
      };
      const order = {
        id: BigInt(99),
        productId: BigInt(10),
        buyerId: BigInt(1),
        sellerId: BigInt(2),
        price_snapshot: 88.5,
        status: 'PENDING',
        meet_location: 'Library',
        meet_time: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue(product),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        order: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue(order),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(tx)
      );
      jest.spyOn(orderService as any, 'convertOrder').mockResolvedValue({
        id: 99,
        status: 'PENDING',
      });

      const result = await orderService.createOrder(1, {
        productId: 10,
        deliveryAddress: 'Library',
        deliveryPhone: '13800138000',
        deliveryName: 'Buyer',
      });

      expect(result).toEqual({ id: 99, status: 'PENDING' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: BigInt(10),
          status: 'ON_SALE',
        },
        data: {
          status: 'RESERVED',
        },
      });
      expect(tx.order.create).toHaveBeenCalledTimes(1);
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects when the product cannot be reserved anymore', async () => {
      const product = {
        id: BigInt(10),
        sellerId: BigInt(2),
        price: 88.5,
        status: 'ON_SALE',
      };
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue(product),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        order: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(tx)
      );

      await expect(
        orderService.createOrder(1, {
          productId: 10,
          deliveryAddress: 'Library',
          deliveryPhone: '13800138000',
          deliveryName: 'Buyer',
        })
      ).rejects.toThrow(BusinessException);

      expect(tx.order.create).not.toHaveBeenCalled();
    });
  });

  describe('shipOrder', () => {
    it('updates the order status inside a transaction', async () => {
      const order = {
        id: BigInt(8),
        productId: BigInt(10),
        buyerId: BigInt(1),
        sellerId: BigInt(2),
        status: 'PENDING',
      };
      const tx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(tx)
      );
      jest.spyOn(orderService, 'getOrderDetail').mockResolvedValue({
        id: 8,
        status: 'SHIPPED',
      } as any);

      const result = await orderService.shipOrder(2, 8);

      expect(result.status).toBe('SHIPPED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(8), sellerId: BigInt(2), status: 'PENDING' },
        data: { status: 'SHIPPED', updatedAt: expect.any(Date) },
      });
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('completeOrder', () => {
    it('updates both order and product inside one transaction', async () => {
      const order = {
        id: BigInt(8),
        productId: BigInt(10),
        buyerId: BigInt(1),
        sellerId: BigInt(2),
        status: 'SHIPPED',
      };
      const tx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(tx)
      );
      jest.spyOn(orderService, 'getOrderDetail').mockResolvedValue({
        id: 8,
        status: 'COMPLETED',
      } as any);

      const result = await orderService.completeOrder(1, 8);

      expect(result.status).toBe('COMPLETED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(8), buyerId: BigInt(1), status: 'SHIPPED' },
        data: { status: 'COMPLETED', updatedAt: expect.any(Date) },
      });
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: { status: 'SOLD', updatedAt: expect.any(Date) },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('cancels the order and releases the product inside one transaction', async () => {
      const order = {
        id: BigInt(8),
        productId: BigInt(10),
        buyerId: BigInt(1),
        sellerId: BigInt(2),
        status: 'PENDING',
      };
      const tx = {
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(tx)
      );
      jest.spyOn(orderService, 'getOrderDetail').mockResolvedValue({
        id: 8,
        status: 'CANCELLED',
      } as any);

      const result = await orderService.cancelOrder(1, 8);

      expect(result.status).toBe('CANCELLED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: {
          id: BigInt(8),
          status: { in: ['PENDING', 'SHIPPED'] },
          OR: [{ buyerId: BigInt(1) }, { sellerId: BigInt(1) }],
        },
        data: { status: 'CANCELLED', updatedAt: expect.any(Date) },
      });
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: { status: 'ON_SALE', updatedAt: expect.any(Date) },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });
});
