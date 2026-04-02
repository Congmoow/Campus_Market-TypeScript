import { ProductStatus } from '@campus-market/shared';
import { z } from 'zod';

const phonePattern = /^1[3-9]\d{9}$/;

const trimmedString = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}不能为空`)
    .max(max, `${label}长度不能超过 ${max} 个字符`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `长度不能超过 ${max} 个字符`).optional();

const optionalNullableText = (max: number) =>
  z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (typeof value !== 'string') {
      return value ?? undefined;
    }

    return value.trim();
  }).pipe(z.string().max(max, `长度不能超过 ${max} 个字符`).optional().nullable());

export const registerSchema = z.object({
  studentId: trimmedString('学号', 20).min(8, '学号长度不能少于 8 个字符'),
  password: z.string().min(6, '密码长度不能少于 6 位').max(100, '密码长度不能超过 100 位'),
  phone: z.string().trim().regex(phonePattern, '手机号格式不正确').optional(),
  name: optionalText(50),
});

export const loginSchema = z.object({
  studentId: trimmedString('学号或手机号', 20),
  password: z.string().min(1, '密码不能为空').max(100, '密码长度不能超过 100 位'),
});

export const resetPasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空').max(100, '旧密码长度不能超过 100 位'),
  newPassword: z.string().min(6, '新密码长度不能少于 6 位').max(100, '新密码长度不能超过 100 位'),
});

export const createProductSchema = z.object({
  title: trimmedString('商品标题', 200),
  description: trimmedString('商品描述', 5000),
  price: z.coerce.number().positive('价格必须大于 0'),
  originalPrice: z.coerce.number().positive('原价必须大于 0').optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional(),
  categoryName: z.string().trim().max(50, '分类名称长度不能超过 50 个字符').optional().nullable(),
  location: trimmedString('交易地点', 100),
  images: z.array(z.string().trim().min(1, '商品图片不能为空')).optional().default([]),
});

export const updateProductSchema = z.object({
  title: optionalText(200),
  description: optionalText(5000),
  price: z.coerce.number().positive('价格必须大于 0').optional(),
  originalPrice: z.coerce.number().positive('原价必须大于 0').optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional(),
  categoryName: z.string().trim().max(50, '分类名称长度不能超过 50 个字符').optional().nullable(),
  location: optionalText(100),
  images: z.array(z.string().trim().min(1, '商品图片不能为空')).optional(),
});

export const updateProductStatusSchema = z.object({
  status: z.enum([
    ProductStatus.ON_SALE,
    ProductStatus.RESERVED,
    ProductStatus.SOLD,
    ProductStatus.DELETED,
  ]),
});

export const createOrderSchema = z.object({
  productId: z.coerce.number().int().positive(),
  meetLocation: trimmedString('交易地点', 100),
  contactPhone: z.string().trim().regex(phonePattern, '手机号格式不正确'),
  contactName: trimmedString('联系人', 50),
  remark: optionalText(500),
});

export const myOrdersQuerySchema = z.object({
  role: z.enum(['BUY', 'SELL']).optional(),
  status: z.enum(['ALL', 'PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, '无效的 userId').transform(Number),
});

export const userProductsQuerySchema = z.object({
  status: z.enum(['ALL', 'ON_SALE', 'SOLD']).optional(),
});

export const updateProfileSchema = z.object({
  name: optionalText(50),
  studentId: z.string().trim().min(1, '学号不能为空').max(20, '学号长度不能超过 20 个字符').optional(),
  phone: optionalNullableText(20).refine(
    (value) => value == null || value === '' || phonePattern.test(value),
    '手机号格式不正确'
  ),
  campus: optionalText(100),
  major: optionalText(100),
  grade: optionalText(100),
  bio: z.string().trim().max(500, '个人简介长度不能超过 500 个字符').optional(),
  avatarUrl: z.string().trim().max(255, '头像地址长度不能超过 255 个字符').optional(),
});
