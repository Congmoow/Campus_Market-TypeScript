import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middlewares/validation.middleware';
import {
  updateProfileSchema,
  userIdParamSchema,
  userProductsQuerySchema,
} from '../validation/request-schemas';

const router = Router();
const userController = new UserController();

router.get('/me/products', authenticate, validateQuery(userProductsQuerySchema), userController.getMyProducts);
router.put('/me', authenticate, validateBody(updateProfileSchema), userController.updateProfile);
router.get('/:userId', validateParams(userIdParamSchema), userController.getUserProfile);
router.get(
  '/:userId/products',
  validateParams(userIdParamSchema),
  validateQuery(userProductsQuerySchema),
  userController.getUserProducts
);

export default router;
