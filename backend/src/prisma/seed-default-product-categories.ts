import { DEFAULT_PRODUCT_CATEGORY_NAMES } from '../constants/product-categories';

type CategorySeederClient = {
  category: {
    upsert(args: {
      where: { name: string };
      update: Record<string, never>;
      create: { name: string };
    }): Promise<unknown>;
  };
};

export async function seedDefaultProductCategories(client: CategorySeederClient): Promise<void> {
  await Promise.all(
    DEFAULT_PRODUCT_CATEGORY_NAMES.map((name) =>
      client.category.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
}
