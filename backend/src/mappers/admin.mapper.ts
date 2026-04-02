import type { Category as PrismaCategory, Order as PrismaOrder, Product as PrismaProduct, ProductImage as PrismaProductImage, User as PrismaUser } from '@prisma/client';
import type {
  AdminCategoryListItem,
  AdminOrderListItem,
  AdminProductListItem,
  AdminUserListItem,
} from '@campus-market/shared';

type ProductWithPreviewImage = PrismaProduct & {
  images: PrismaProductImage[];
};

export function mapAdminUser(user: PrismaUser): AdminUserListItem {
  return {
    id: Number(user.id),
    studentId: user.studentId,
    phone: user.phone,
    role: user.role,
    enabled: user.enabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function mapAdminProduct(product: ProductWithPreviewImage): AdminProductListItem {
  return {
    id: Number(product.id),
    sellerId: Number(product.sellerId),
    title: product.title,
    description: product.description,
    price: Number(product.price),
    status: product.status,
    viewCount: Number(product.viewCount),
    imageUrl: product.images[0]?.url,
    createdAt: product.createdAt,
  };
}

export function mapAdminOrder(order: PrismaOrder): AdminOrderListItem {
  return {
    id: Number(order.id),
    orderNo: order.order_no,
    buyerId: Number(order.buyerId),
    sellerId: Number(order.sellerId),
    productId: Number(order.productId),
    status: order.status,
    priceSnapshot: Number(order.price_snapshot),
    meetLocation: order.meet_location,
    meetTime: order.meet_time,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function mapAdminCategory(
  category: PrismaCategory,
  productCount: number
): AdminCategoryListItem {
  return {
    id: Number(category.id),
    name: category.name,
    productCount,
  };
}
