/**
 * 业务异常类
 */
export class BusinessException extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}

/**
 * 未授权异常
 */
export class UnauthorizedException extends BusinessException {
  constructor(message: string = '未授权访问') {
    super(message, 401);
    this.name = 'UnauthorizedException';
  }
}

/**
 * 禁止访问异常
 */
export class ForbiddenException extends BusinessException {
  constructor(message: string = '禁止访问') {
    super(message, 403);
    this.name = 'ForbiddenException';
  }
}

/**
 * 资源未找到异常
 */
export class NotFoundException extends BusinessException {
  constructor(message: string = '资源未找到') {
    super(message, 404);
    this.name = 'NotFoundException';
  }
}

/**
 * 验证异常
 */
export class ValidationException extends BusinessException {
  constructor(message: string = '数据验证失败') {
    super(message, 400);
    this.name = 'ValidationException';
  }
}
