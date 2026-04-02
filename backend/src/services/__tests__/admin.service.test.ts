import { AdminService } from '../admin.service';
import { prisma } from '../../utils/prisma.util';

jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('AdminService', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  it('maps user management results to admin user DTOs', async () => {
    const now = new Date('2026-04-02T08:00:00.000Z');
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: BigInt(1),
        studentId: '20230001',
        phone: '13800000000',
        role: 'USER',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await adminService.getAllUsers(1, 20, '2023');

    expect(result).toEqual({
      users: [
        {
          id: 1,
          studentId: '20230001',
          phone: '13800000000',
          role: 'USER',
          enabled: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it('maps product management results without leaking Prisma image arrays', async () => {
    const now = new Date('2026-04-02T08:00:00.000Z');
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      {
        id: BigInt(11),
        sellerId: BigInt(3),
        title: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 199.5,
        status: 'ON_SALE',
        viewCount: BigInt(12),
        createdAt: now,
        images: [{ url: '/uploads/products/keyboard.png' }],
      },
    ]);
    (prisma.product.count as jest.Mock).mockResolvedValue(1);

    const result = await adminService.getAllProducts(1, 20);

    expect(result.products[0]).toEqual({
      id: 11,
      sellerId: 3,
      title: 'Keyboard',
      description: 'Mechanical keyboard',
      price: 199.5,
      status: 'ON_SALE',
      viewCount: 12,
      imageUrl: '/uploads/products/keyboard.png',
      createdAt: now,
    });
    expect(result.products[0]).not.toHaveProperty('images');
  });

  it('maps order management results to camel-cased admin DTOs', async () => {
    const now = new Date('2026-04-02T08:00:00.000Z');
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: BigInt(21),
        order_no: 'ORD20260402000001',
        buyerId: BigInt(7),
        sellerId: BigInt(8),
        productId: BigInt(9),
        status: 'COMPLETED',
        price_snapshot: 88.5,
        meet_location: '紫金港校区',
        meet_time: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    (prisma.order.count as jest.Mock).mockResolvedValue(1);

    const result = await adminService.getAllOrders(1, 20);

    expect(result.orders[0]).toEqual({
      id: 21,
      orderNo: 'ORD20260402000001',
      buyerId: 7,
      sellerId: 8,
      productId: 9,
      status: 'COMPLETED',
      priceSnapshot: 88.5,
      meetLocation: '紫金港校区',
      meetTime: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.orders[0]).not.toHaveProperty('order_no');
    expect(result.orders[0]).not.toHaveProperty('price_snapshot');
  });
});
