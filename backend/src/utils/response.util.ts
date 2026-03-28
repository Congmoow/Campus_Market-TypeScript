import { ApiResponse } from '../types/shared';

/**
 * 成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * 错误响应
 */
export function errorResponse(message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
  };
}
