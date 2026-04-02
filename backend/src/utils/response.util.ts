import type { ApiResponse } from '@campus-market/shared';

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
  };
}
