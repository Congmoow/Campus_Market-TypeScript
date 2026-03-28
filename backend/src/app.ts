import express, { Application } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import chatRoutes from './routes/chat.routes';
import favoriteRoutes from './routes/favorite.routes';
import uploadRoutes from './routes/upload.routes';
import adminRoutes from './routes/admin.routes';
import { getJwtConfig } from './config/jwt.config';
import { uploadConfig } from './config/upload.config';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Load environment variables
dotenv.config();
getJwtConfig();

function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configuredOrigins = env.FRONTEND_URL?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) ?? [];

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (env.NODE_ENV !== 'production') {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  return [];
}

export function buildCorsOptions(
  env: NodeJS.ProcessEnv = process.env
): CorsOptions {
  const allowedOrigins = new Set(getAllowedOrigins(env));

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  };
}

const app: Application = express();

// Middleware
app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(uploadConfig.uploadDir));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Campus Market Backend is running' });
});

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
console.log('Routes registered successfully');

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;
