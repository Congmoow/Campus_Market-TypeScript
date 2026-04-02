import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validation/request-schemas';

const router = Router();
const authController = new AuthController();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.getCurrentUser);
router.post(
  '/reset-password',
  authenticate,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

export default router;
