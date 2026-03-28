import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../error.middleware';
import {
  BusinessException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../utils/error.util';

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = {};
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  it('should handle BusinessException', () => {
    const error = new BusinessException('业务错误', 400);

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '业务错误',
      statusCode: 400,
    });
  });

  it('should handle UnauthorizedException', () => {
    const error = new UnauthorizedException('未授权');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '未授权',
      statusCode: 401,
    });
  });

  it('should handle ForbiddenException', () => {
    const error = new ForbiddenException('禁止访问');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '禁止访问',
      statusCode: 403,
    });
  });

  it('should handle NotFoundException', () => {
    const error = new NotFoundException('资源未找到');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '资源未找到',
      statusCode: 404,
    });
  });

  it('should handle ValidationException', () => {
    const error = new ValidationException('验证失败');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '验证失败',
      statusCode: 400,
    });
  });

  it('should handle generic Error as 500', () => {
    const error = new Error('未知错误');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '服务器内部错误',
      statusCode: 500,
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should include error details in development mode', () => {
    const error = new Error('开发环境错误');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: '服务器内部错误',
      error: '开发环境错误',
      statusCode: 500,
    });

    process.env.NODE_ENV = originalEnv;
  });
});
