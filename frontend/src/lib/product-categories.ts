export const PUBLISH_CATEGORY_ORDER = [
  '数码产品',
  '书籍教材',
  '生活用品',
  '衣物鞋帽',
  '美妆护肤',
  '运动器材',
  '其他',
] as const;

type NamedCategory = {
  name: string;
};

const publishCategoryOrderIndex = new Map(
  PUBLISH_CATEGORY_ORDER.map((name, index) => [name, index])
);

export const sortCategoriesByPublishOrder = <T extends NamedCategory>(categories: T[]): T[] => {
  const uniqueCategories = categories.filter(
    (category, index, list) => list.findIndex((item) => item.name === category.name) === index
  );

  return [...uniqueCategories].sort((left, right) => {
    const leftIndex = publishCategoryOrderIndex.get(left.name);
    const rightIndex = publishCategoryOrderIndex.get(right.name);

    if (leftIndex != null && rightIndex != null) {
      return leftIndex - rightIndex;
    }

    if (leftIndex != null) {
      return -1;
    }

    if (rightIndex != null) {
      return 1;
    }

    return 0;
  });
};
