import { Request, Response, NextFunction } from 'express';
import { BusinessException } from '../utils/error.util';
import { errorResponse } from '../utils/response.util';

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 避免重复发送响应
  if (res.headersSent) {
    return next(err);
  }

  // 业务异常
  if (err instanceof BusinessException) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    } as ErrorResponse);
  }

  // 未知错误
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    statusCode: 500,
  } as ErrorResponse);
};

/**
 * 404 错误处理中间件
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json(errorResponse('接口不存在'));
};
