import { DEFAULT_PRODUCT_CATEGORY_NAMES } from '../constants/product-categories';
import { seedDefaultProductCategories } from '../prisma/seed-default-product-categories';

describe('seedDefaultProductCategories', () => {
  it('upserts every default product category', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const lastCategoryName =
      DEFAULT_PRODUCT_CATEGORY_NAMES[DEFAULT_PRODUCT_CATEGORY_NAMES.length - 1];

    await seedDefaultProductCategories({
      category: { upsert },
    } as any);

    expect(upsert).toHaveBeenCalledTimes(DEFAULT_PRODUCT_CATEGORY_NAMES.length);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: { name: DEFAULT_PRODUCT_CATEGORY_NAMES[0] },
      update: {},
      create: { name: DEFAULT_PRODUCT_CATEGORY_NAMES[0] },
    });
    expect(upsert).toHaveBeenNthCalledWith(DEFAULT_PRODUCT_CATEGORY_NAMES.length, {
      where: { name: lastCategoryName },
      update: {},
      create: { name: lastCategoryName },
    });
  });
});
