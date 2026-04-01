import { ProductService } from '../product.service';
import { prisma } from '../../utils/prisma.util';

jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    userProfile: {
      findMany: jest.fn(),
    },
  },
}));

describe('ProductService price range filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('applies minPrice and maxPrice together with existing filters and sorting', async () => {
    const productService = new ProductService();

    await productService.getProductList({
      categoryId: 1,
      minPrice: 100,
      maxPrice: 500,
      sort: 'priceAsc',
      page: 0,
      size: 20,
    } as any);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: BigInt(1),
          price: {
            gte: 100,
            lte: 500,
          },
        }),
        orderBy: {
          price: 'asc',
        },
      })
    );

    expect(prisma.product.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          price: {
            gte: 100,
            lte: 500,
          },
        }),
      })
    );
  });
});
