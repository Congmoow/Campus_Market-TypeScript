import { ProductService } from '../product.service';
import { prisma } from '../../utils/prisma.util';
import {
  BusinessException,
  NotFoundException,
  ForbiddenException,
} from '../../utils/error.util';

// Mock Prisma
jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userProfile: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    productImage: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
    jest.clearAllMocks();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('getLatestProducts', () => {
    it('should return latest products', async () => {
      const mockProducts = [
        {
          id: BigInt(1),
          title: 'Product 1',
          description: 'Description 1',
          price: 100,
          status: 'ON_SALE',
          sellerId: BigInt(1),
          viewCount: BigInt(0),
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
        },
      ];

      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
      };

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await productService.getLatestProducts(20);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Product 1');
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { status: 'ON_SALE' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { images: true },
      });
    });
  });

  describe('getProductList', () => {
    it('should return paginated product list', async () => {
      const mockProducts = [
        {
          id: BigInt(1),
          title: 'Product 1',
          description: 'Description 1',
          price: 100,
          status: 'ON_SALE',
          sellerId: BigInt(1),
          viewCount: BigInt(0),
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
        },
      ];

      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
      };

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await productService.getProductList({
        page: 0,
        size: 20,
      });

      expect(result.content).toHaveLength(1);
      expect(result.totalElements).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by category', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await productService.getProductList({
        categoryId: 1,
        page: 0,
        size: 20,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: BigInt(1),
          }),
        })
      );
    });

    it('should filter by keyword', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);

      await productService.getProductList({
        keyword: 'test',
        page: 0,
        size: 20,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getProductDetail', () => {
    it('should return product detail', async () => {
      const mockProduct = {
        id: BigInt(1),
        title: 'Product 1',
        description: 'Description 1',
        price: 100,
        status: 'ON_SALE',
        sellerId: BigInt(1),
        categoryId: BigInt(1),
        viewCount: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
      };

      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
      };

      const mockCategory = {
        id: BigInt(1),
        name: 'Category 1',
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      const result = await productService.getProductDetail(1);

      expect(result.title).toBe('Product 1');
      expect(result.category).toBeDefined();
    });

    it('should expose seller nickname as a compatibility alias', async () => {
      const mockProduct = {
        id: BigInt(1),
        title: 'Product 1',
        description: 'Description 1',
        price: 100,
        status: 'ON_SALE',
        sellerId: BigInt(1),
        viewCount: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
      };

      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProfile = {
        id: BigInt(1),
        userId: BigInt(1),
        name: 'Test User',
        studentId: '20240001',
        campus: '下沙校区',
        bio: 'Hello',
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userProfile.findFirst as jest.Mock).mockResolvedValue(mockProfile);

      const result = await productService.getProductDetail(1);

      expect(result.seller.profile?.name).toBe('Test User');
      expect(result.seller.profile?.nickname).toBe('Test User');
    });

    it('should throw error if product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(productService.getProductDetail(999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      const productData = {
        title: 'New Product',
        description: 'Description',
        price: 100,
        categoryId: 1,
        location: 'Location',
        images: ['image1.jpg'],
      };

      const mockCategory = {
        id: BigInt(1),
        name: 'Category 1',
      };

      const mockProduct = {
        id: BigInt(1),
        ...productData,
        price: 100,
        sellerId: BigInt(1),
        categoryId: BigInt(1),
        status: 'ON_SALE',
        viewCount: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [{ id: BigInt(1), productId: BigInt(1), url: 'image1.jpg' }],
      };

      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
      };

      (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await productService.createProduct(1, productData);

      expect(result.title).toBe('New Product');
      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('should throw error for invalid price', async () => {
      const productData = {
        title: 'New Product',
        description: 'Description',
        price: -10,
        categoryId: 1,
        location: 'Location',
        images: [],
      };

      await expect(
        productService.createProduct(1, productData)
      ).rejects.toThrow(BusinessException);
      await expect(
        productService.createProduct(1, productData)
      ).rejects.toThrow('价格必须大于0');
    });

    it('should throw error for empty title', async () => {
      const productData = {
        title: '',
        description: 'Description',
        price: 100,
        categoryId: 1,
        location: 'Location',
        images: [],
      };

      await expect(
        productService.createProduct(1, productData)
      ).rejects.toThrow(BusinessException);
    });

    it('should throw error for non-existent category', async () => {
      const productData = {
        title: 'New Product',
        description: 'Description',
        price: 100,
        categoryId: 999,
        location: 'Location',
        images: [],
      };

      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        productService.createProduct(1, productData)
      ).rejects.toThrow(BusinessException);
      await expect(
        productService.createProduct(1, productData)
      ).rejects.toThrow('分类不存在');
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const mockProduct = {
        id: BigInt(1),
        title: 'Old Title',
        sellerId: BigInt(1),
        status: 'ON_SALE',
      };

      const updateData = {
        title: 'New Title',
        price: 150,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        ...updateData,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
      });
      (prisma.userProfile.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await productService.updateProduct(1, 1, updateData);

      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('should throw error if product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        productService.updateProduct(1, 999, { title: 'New Title' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if user is not the seller', async () => {
      const mockProduct = {
        id: BigInt(1),
        title: 'Product',
        sellerId: BigInt(2),
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      await expect(
        productService.updateProduct(1, 1, { title: 'New Title' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const mockProduct = {
        id: BigInt(1),
        sellerId: BigInt(1),
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({});

      await productService.deleteProduct(1, 1);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { status: 'DELETED' },
      });
    });

    it('should throw error if user is not the seller', async () => {
      const mockProduct = {
        id: BigInt(1),
        sellerId: BigInt(2),
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      await expect(productService.deleteProduct(1, 1)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('increaseViewCount', () => {
    it('should increase view count', async () => {
      (prisma.product.update as jest.Mock).mockResolvedValue({});

      await productService.increaseViewCount(1);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { viewCount: { increment: 1 } },
      });
    });
  });

  describe('getCategoryList', () => {
    it('should return category list', async () => {
      const mockCategories = [
        { id: BigInt(1), name: 'Category 1' },
        { id: BigInt(2), name: 'Category 2' },
      ];

      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await productService.getCategoryList();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Category 1');
    });
  });
});
