import type { CreateProductRequest, UpdateProductRequest } from '@campus-market/shared';
import { prisma } from '../utils/prisma.util';
import { BusinessException } from '../utils/error.util';

type CategoryInput = Pick<
  CreateProductRequest | UpdateProductRequest,
  'categoryId' | 'categoryName'
>;

export class ProductCategoryService {
  async resolveCategoryId(data: CategoryInput): Promise<bigint | null | undefined> {
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await this.getCategoryById(BigInt(data.categoryId));

      if (!category) {
        throw new BusinessException('分类不存在');
      }

      return BigInt(data.categoryId);
    }

    if (data.categoryName === undefined) {
      return undefined;
    }

    const normalizedCategoryName = data.categoryName?.trim();
    if (!normalizedCategoryName) {
      return null;
    }

    const existingCategory = await this.findCategoryByName(normalizedCategoryName);

    if (existingCategory) {
      return existingCategory.id;
    }

    throw new BusinessException('分类不存在');
  }

  async getCategoryById(categoryId: bigint) {
    return prisma.category.findUnique({
      where: { id: categoryId },
    });
  }

  async findCategoryByName(name: string) {
    return prisma.category.findFirst({
      where: { name },
    });
  }
}
