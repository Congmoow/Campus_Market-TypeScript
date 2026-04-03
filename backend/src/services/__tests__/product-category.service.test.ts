import { ProductCategoryService } from '../product-category.service';
import { prisma } from '../../utils/prisma.util';
import { BusinessException } from '../../utils/error.util';

jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('ProductCategoryService', () => {
  let productCategoryService: ProductCategoryService;

  beforeEach(() => {
    productCategoryService = new ProductCategoryService();
    jest.clearAllMocks();
  });

  it('returns undefined when category fields are omitted', async () => {
    await expect(productCategoryService.resolveCategoryId({} as any)).resolves.toBeUndefined();
  });

  it('returns null when categoryName is blank after trimming', async () => {
    await expect(
      productCategoryService.resolveCategoryId({ categoryName: '   ' } as any),
    ).resolves.toBeNull();
  });

  it('trims categoryName before querying', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: BigInt(8),
      name: '运动器材',
    });

    await expect(
      productCategoryService.resolveCategoryId({ categoryName: '  运动器材  ' } as any),
    ).resolves.toBe(BigInt(8));

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { name: '运动器材' },
    });
  });

  it('keeps the original exception when category does not exist', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      productCategoryService.resolveCategoryId({ categoryId: 999 } as any),
    ).rejects.toThrow(BusinessException);
    await expect(
      productCategoryService.resolveCategoryId({ categoryId: 999 } as any),
    ).rejects.toThrow('分类不存在');
  });
});
