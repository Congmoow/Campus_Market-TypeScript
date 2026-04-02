import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationException } from '../utils/error.util';

type AnySchema = z.ZodType<unknown>;

const formatValidationError = (error: ZodError): string =>
  error.errors
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

export function validateBody(schema: AnySchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationException(formatValidationError(error)));
        return;
      }

      next(error);
    }
  };
}

export function validateQuery(schema: AnySchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationException(formatValidationError(error)));
        return;
      }

      next(error);
    }
  };
}

export function validateParams(schema: AnySchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationException(formatValidationError(error)));
        return;
      }

      next(error);
    }
  };
}

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, '无效的 ID').transform(Number),
});

export const paginationQuerySchema = z.object({
  page: z.string().optional().default('0').transform(Number),
  size: z.string().optional().default('20').transform(Number),
});
