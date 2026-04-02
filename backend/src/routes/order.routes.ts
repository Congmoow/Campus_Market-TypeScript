import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  idParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from '../middlewares/validation.middleware';
import {
  createOrderSchema,
  myOrdersQuerySchema,
} from '../validation/request-schemas';

const router = Router();
const orderController = new OrderController();

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

router.get(
  '/my/sales',
  authenticate,
  validateQuery(myOrdersQuerySchema),
  orderController.getMySalesOrders
);

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
