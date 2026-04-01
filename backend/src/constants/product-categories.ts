export const DEFAULT_PRODUCT_CATEGORY_NAMES = [
  '数码产品',
  '书籍教材',
  '生活用品',
  '衣物鞋帽',
  '美妆护肤',
  '运动器材',
  '其他',
] as const;

const defaultCategoryOrder = new Map<string, number>(
  DEFAULT_PRODUCT_CATEGORY_NAMES.map((name, index) => [name, index])
);

export const sortCategoryEntitiesByDefaultOrder = <T extends { id: bigint | number; name: string }>(
  categories: T[]
): T[] => {
  return [...categories].sort((left, right) => {
    const leftIndex = defaultCategoryOrder.get(left.name);
    const rightIndex = defaultCategoryOrder.get(right.name);

    if (leftIndex != null && rightIndex != null) {
      return leftIndex - rightIndex;
    }

    if (leftIndex != null) {
      return -1;
    }

    if (rightIndex != null) {
      return 1;
    }

    return Number(left.id) - Number(right.id);
  });
};
