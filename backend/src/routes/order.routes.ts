import { Router } from 'express';
import { z } from 'zod';
import { OrderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  idParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from '../middlewares/validation.middleware';

const router = Router();
const orderController = new OrderController();

const createOrderSchema = z.object({
  productId: z.coerce.number().int().positive(),
  meetLocation: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1),
  contactName: z.string().trim().min(1),
  remark: z.string().optional(),
});

const myOrdersQuerySchema = z.object({
  role: z.enum(['BUY', 'SELL']).optional(),
  status: z
    .enum(['ALL', 'PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'DONE'])
    .optional(),
});

router.post(
  '/',
  authenticate,
  validateBody(createOrderSchema),
  orderController.create
);

router.get(
  '/me',
  authenticate,
  validateQuery(myOrdersQuerySchema),
  orderController.getMyOrders
);

router.get(
  '/my/purchases',
  authenticate,
  validateQuery(myOrdersQuerySchema),
  orderController.getMyOrders
);

router.get('/my/sales', authenticate, orderController.getMySalesOrders);

router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  orderController.getDetail
);

router.post(
  '/:id/ship',
  authenticate,
  validateParams(idParamSchema),
  orderController.ship
);

router.post(
  '/:id/complete',
  authenticate,
  validateParams(idParamSchema),
  orderController.complete
);

router.post(
  '/:id/cancel',
  authenticate,
  validateParams(idParamSchema),
  orderController.cancel
);

export default router;

