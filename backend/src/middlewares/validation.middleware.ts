import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodTypeAny } from 'zod';
import { ValidationException } from '../utils/error.util';

/**
 * 验证请求体的中间件工厂函数
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationException(messages.join('; ')));
      } else {
        next(error);
      }
    }
  };
}

/**
 * 验证查询参数的中间件工厂函数
 */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationException(messages.join('; ')));
      } else {
        next(error);
      }
    }
  };
}

/**
 * 验证路径参数的中间件工厂函数
 */
export function validateParams(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationException(messages.join('; ')));
      } else {
        next(error);
      }
    }
  };
}

// ========== 常用验证 Schema ==========

/**
 * ID 参数验证
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, '无效的 ID').transform(Number),
});

/**
 * 分页查询参数验证
 */
export const paginationQuerySchema = z.object({
  page: z.string().optional().default('0').transform(Number),
  size: z.string().optional().default('20').transform(Number),
});
