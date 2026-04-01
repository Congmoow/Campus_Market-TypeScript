import { Router } from 'express';
import { z } from 'zod';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  idParamSchema,
  validateParams,
  validateQuery,
} from '../middlewares/validation.middleware';

const router = Router();
const productController = new ProductController();

const productListQuerySchema = z.object({
  categoryId: z
    .string()
    .regex(/^\d+$/, '无效的 categoryId')
    .transform(Number)
    .optional(),
  keyword: z.string().optional(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, '无效的 minPrice')
    .transform(Number)
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, '无效的 maxPrice')
    .transform(Number)
    .optional(),
  sort: z.enum(['latest', 'priceAsc', 'priceDesc', 'viewDesc']).optional(),
  page: z
    .string()
    .optional()
    .default('0')
    .transform(Number)
    .refine(value => Number.isInteger(value) && value >= 0, 'page 必须大于等于 0'),
  size: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .refine(value => Number.isInteger(value) && value > 0, 'size 必须大于 0'),
});

const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, '无效的 userId').transform(Number),
});

router.get('/latest', productController.getLatest);
router.get('/my', authenticate, productController.getMyProducts);
router.get('/', validateQuery(productListQuerySchema), productController.getList);
router.get('/:id', validateParams(idParamSchema), productController.getDetail);
router.post('/', authenticate, productController.create);
router.put('/:id', authenticate, validateParams(idParamSchema), productController.update);
router.delete(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  productController.delete
);
router.patch(
  '/:id/status',
  authenticate,
  validateParams(idParamSchema),
  productController.updateStatus
);
router.post('/:id/view', validateParams(idParamSchema), productController.increaseView);
router.get(
  '/user/:userId',
  validateParams(userIdParamSchema),
  productController.getUserProducts
);

export default router;
